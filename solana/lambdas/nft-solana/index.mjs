// effisend-nft-solana — create / mint / distribute the "Effi" collection on Solana
// as compressed NFTs (Metaplex Bubblegum V1 + a Token Metadata collection NFT).
//
// Signs with the Solana operator from the KMS-encrypted chain-operators secret;
// the key never leaves this function. Invoke-only (no function URL).
//
// Why cNFTs: a regular Token Metadata NFT locks ~0.0074 SOL of rent per NFT; a
// cNFT costs one transaction fee once the tree exists. Depth-8 tree = 256 leaves,
// no canopy (cheapest; proofs of 8 nodes still fit in a transfer transaction).
// Reading/transferring cNFTs uses the DAS API (the official RPC supports it).
//
// Event: { action, ... }
//   status            {}              -> collection/tree + treasury holdings (no signing)
//   createCollection  {}              -> { collectionMint }  (refuses if already set)
//   createTree        {}              -> { merkleTree }      (refuses if already set)
//   mintBatch         { quantity }    -> mints to the treasury (operator), confirming each
//   mintUntil         { target }      -> idempotent: tops the tree up to `target` minted,
//                                        counting on-chain (TreeConfig.numMinted)
//   distribute        { to }          -> transfers the next treasury cNFT to `to`
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { firstWorking, registryReady, registryRpcs } from "./rpcRegistry.mjs";
import {
  createTree,
  fetchTreeConfigFromSeeds,
  getAssetWithProof,
  mintToCollectionV1,
  mplBubblegum,
  transfer,
} from "@metaplex-foundation/mpl-bubblegum";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import bs58 from "bs58";

const KMS_KEY_ID = "alias/effisend-secrets";
const TABLE = "Effisend-Ops-Secrets";
const SECRET_PATH = "effisend/prod/chain-operators";
// Reads that need the DAS API (searchAssets, getAssetProof) go to the official
// RPC; transactions go to a separate endpoint because the official public RPC
// 429s AWS IPs under minting load (confirmed on 2026-09-23).
const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const SEND_RPC = process.env.SOLANA_SEND_RPC || "https://solana-rpc.publicnode.com";

// web3.js retries 429s in background promises; a late rejection must not crash
// the whole invocation mid-batch.
process.on("unhandledRejection", (reason) => {
  console.error("[effisend-nft-solana] unhandled rejection:", reason?.message || String(reason));
});

const NFT_NAME = "Effi";
const NFT_SYMBOL = "EFFI";
const NFT_URI = "https://effisend-tdc.expo.app/nft/effi.json";
const MAX_MINT = 100;
// The public RPC rate-limits (~40 calls/method/10s); parallel sendAndConfirm
// polling hit 429s. Mint one at a time with a short pause.
const MINT_CONCURRENCY = 1;
const MINT_PAUSE_MS = 400;

// Set after createCollection / createTree, then update the function config.
const COLLECTION_MINT = process.env.SOL_COLLECTION_MINT || "";
const MERKLE_TREE = process.env.SOL_MERKLE_TREE || "";

const ddb = new DynamoDBClient({});
const kms = new KMSClient({});

async function readOperatorSecretKey() {
  // Local devnet tests only (tests/devnet.mjs): never honored inside Lambda.
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.LOCAL_TEST_SECRET_KEY) {
    return Uint8Array.from(JSON.parse(process.env.LOCAL_TEST_SECRET_KEY));
  }
  const got = await ddb.send(
    new GetItemCommand({ TableName: TABLE, Key: { secretPath: { S: SECRET_PATH } } }),
  );
  if (!got.Item) throw new Error("chain-operators secret not found");
  const decrypted = await kms.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(got.Item.encryptedBlob.S, "base64"),
      KeyId: KMS_KEY_ID,
    }),
  );
  const s = JSON.parse(Buffer.from(decrypted.Plaintext).toString("utf8"));
  if (!s.SOLANA_OPERATOR_KEY) throw new Error("Solana operator not configured");
  // Stored either as a JSON byte array or base58 (same tolerance as pool-wallet-provision).
  try {
    return Uint8Array.from(JSON.parse(s.SOLANA_OPERATOR_KEY));
  } catch {
    return bs58.decode(s.SOLANA_OPERATOR_KEY);
  }
}

function baseUmi(endpoint = RPC) {
  return createUmi(endpoint, { commitment: "confirmed" }).use(mplTokenMetadata()).use(mplBubblegum());
}

async function signingUmi() {
  // One healthy endpoint for the whole invocation, so a send is never repeated
  // through another RPC: SEND_RPC first (it lands transactions reliably), the
  // registry's Solana list only as backup.
  // Alchemy (paid; key only in this Lambda's env) last: only if every free one is down.
  const paid = process.env.ALCHEMY_API_KEY ? [`https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`] : [];
  const sendRpc = await firstWorking([SEND_RPC, ...registryRpcs("solana", []).filter((u) => u !== SEND_RPC), ...paid], "getSlot");
  console.log("[effisend-nft-solana] send endpoint", new URL(sendRpc).hostname);
  const umi = baseUmi(sendRpc);
  const keypair = umi.eddsa.createKeypairFromSecretKey(await readOperatorSecretKey());
  return umi.use(keypairIdentity(keypair));
}

const sig58 = (signature) => bs58.encode(signature);

// Treasury-held cNFTs of this collection (DAS).
async function treasuryAssets(umi, owner, limit = 100) {
  const page = await umi.rpc.searchAssets({
    owner: publicKey(owner),
    grouping: ["collection", COLLECTION_MINT],
    compressed: true,
    limit,
    page: 1, // without it the RPC answers null and umi throws "No assets found"
    sortBy: { sortBy: "created", sortDirection: "asc" },
  });
  return page.items || [];
}

const ok = (result) => ({ statusCode: 200, body: JSON.stringify({ error: null, result }) });
const fail = (error) => ({ statusCode: 200, body: JSON.stringify({ error, result: null }) });

export const handler = async (event) => {
  const input = typeof event?.body === "string" ? JSON.parse(event.body) : event || {};
  const { action } = input;
  await registryReady();
  try {
    if (action === "status") {
      const result = { collectionMint: COLLECTION_MINT || null, merkleTree: MERKLE_TREE || null };
      if (COLLECTION_MINT && input.owner) {
        result.treasuryHolds = (await treasuryAssets(baseUmi(), input.owner)).length;
      }
      return ok(result);
    }

    const umi = await signingUmi();
    const operator = umi.identity.publicKey.toString();

    if (action === "createCollection") {
      if (COLLECTION_MINT) return fail(`Collection already exists: ${COLLECTION_MINT}`);
      const mint = generateSigner(umi);
      const { signature } = await createNft(umi, {
        mint,
        name: NFT_NAME,
        symbol: NFT_SYMBOL,
        uri: NFT_URI,
        sellerFeeBasisPoints: percentAmount(0),
        isCollection: true,
      }).sendAndConfirm(umi);
      const result = { collectionMint: mint.publicKey.toString(), signature: sig58(signature), operator };
      console.log("[effisend-nft-solana] createCollection", JSON.stringify(result));
      return ok(result);
    }

    if (action === "createTree") {
      if (MERKLE_TREE) return fail(`Tree already exists: ${MERKLE_TREE}`);
      const merkleTree = generateSigner(umi);
      const builder = await createTree(umi, { merkleTree, maxDepth: 8, maxBufferSize: 16, canopyDepth: 0 });
      const { signature } = await builder.sendAndConfirm(umi);
      const result = { merkleTree: merkleTree.publicKey.toString(), capacity: 256, signature: sig58(signature) };
      console.log("[effisend-nft-solana] createTree", JSON.stringify(result));
      return ok(result);
    }

    if (!COLLECTION_MINT || !MERKLE_TREE) return fail("Collection or tree not configured yet");

    if (action === "mintUntil") {
      // Exact and idempotent regardless of RPC confirmation quirks: count from the
      // tree's own numMinted, send only what's missing without waiting per tx,
      // then wait until every sent blockhash has EXPIRED (nothing in flight can
      // still land) before recounting. Never mints past the target.
      const target = Number(input.target);
      if (!Number.isInteger(target) || target < 1 || target > 256) return fail("target must be 1-256 (tree capacity)");
      const readUmi = baseUmi(RPC);
      const minted = async () =>
        Number((await fetchTreeConfigFromSeeds(readUmi, { merkleTree: publicKey(MERKLE_TREE) })).numMinted);
      const rounds = [];
      let nonce = Date.now() % 100000;
      for (let round = 1; round <= 4; round++) {
        const before = await minted();
        const missing = target - before;
        if (missing <= 0) break;
        const { blockhash, lastValidBlockHeight } = await umi.rpc.getLatestBlockhash({ commitment: "confirmed" });
        let sent = 0;
        let sendErrors = 0;
        for (let i = 0; i < missing; i++) {
          try {
            const tx = await setComputeUnitPrice(umi, { microLamports: 1000 + nonce++ })
              .add(mintToCollectionV1(umi, {
                leafOwner: umi.identity.publicKey,
                merkleTree: publicKey(MERKLE_TREE),
                collectionMint: publicKey(COLLECTION_MINT),
                metadata: {
                  name: NFT_NAME, symbol: NFT_SYMBOL, uri: NFT_URI, sellerFeeBasisPoints: 0,
                  collection: { key: publicKey(COLLECTION_MINT), verified: false },
                  creators: [{ address: umi.identity.publicKey, verified: false, share: 100 }],
                },
              }))
              .setBlockhash({ blockhash, lastValidBlockHeight })
              .buildAndSign(umi);
            await umi.rpc.sendTransaction(tx, { skipPreflight: true, maxRetries: 3 });
            sent++;
          } catch (error) {
            sendErrors++;
            console.warn("[effisend-nft-solana] send failed:", error.message);
          }
          await new Promise((r) => setTimeout(r, 350));
        }
        // Wait for the blockhash to expire so late landings can't skew the recount.
        for (;;) {
          const height = await readUmi.rpc.call("getBlockHeight", [{ commitment: "confirmed" }]);
          if (height > lastValidBlockHeight) break;
          await new Promise((r) => setTimeout(r, 4000));
        }
        const after = await minted();
        rounds.push({ round, before, missing, sent, sendErrors, after });
        console.log("[effisend-nft-solana] mintUntil round", JSON.stringify(rounds.at(-1)));
      }
      const final = await minted();
      return ok({ target, numMinted: final, done: final >= target, rounds });
    }

    if (action === "mintBatch") {
      const quantity = Number(input.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_MINT) {
        return fail(`quantity must be an integer between 1 and ${MAX_MINT}`);
      }
      // Every mint must be a UNIQUE transaction: concurrent identical mints share a
      // blockhash and serialize to the same bytes (same signature), so only one
      // lands. A distinct compute-unit price per mint makes each one unique.
      let nonce = 0;
      const mintOne = () =>
        setComputeUnitPrice(umi, { microLamports: 1000 + nonce++ }).add(mintToCollectionV1(umi, {
          leafOwner: umi.identity.publicKey,
          merkleTree: publicKey(MERKLE_TREE),
          collectionMint: publicKey(COLLECTION_MINT),
          metadata: {
            name: NFT_NAME,
            symbol: NFT_SYMBOL,
            uri: NFT_URI,
            sellerFeeBasisPoints: 0,
            collection: { key: publicKey(COLLECTION_MINT), verified: false },
            creators: [{ address: umi.identity.publicKey, verified: false, share: 100 }],
          },
        })).sendAndConfirm(umi);

      const signatures = [];
      let failed = 0;
      let lastError = null;
      for (let done = 0; done < quantity; done += MINT_CONCURRENCY) {
        const n = Math.min(MINT_CONCURRENCY, quantity - done);
        const settled = await Promise.allSettled(Array.from({ length: n }, mintOne));
        for (const r of settled) {
          if (r.status === "fulfilled") signatures.push(sig58(r.value.signature));
          else {
            failed += 1;
            lastError = r.reason?.message || String(r.reason);
          }
        }
        // Stop on errors: an unconfirmed send may still land, so recount before retrying.
        if (failed) break;
        await new Promise((r) => setTimeout(r, MINT_PAUSE_MS));
      }
      const unique = new Set(signatures);
      const result = {
        requested: quantity,
        confirmed: unique.size,
        failed,
        lastError,
        note: failed ? "Some mints failed or are unconfirmed — check treasury holdings (status) before minting more." : undefined,
        firstSignature: signatures[0],
        lastSignature: signatures.at(-1),
      };
      console.log("[effisend-nft-solana] mintBatch", JSON.stringify(result));
      return ok(result);
    }

    if (action === "distribute") {
      let to;
      try {
        to = publicKey(String(input.to || ""));
      } catch {
        return fail("Invalid Solana address");
      }
      const dasUmi = baseUmi(RPC);
      const [asset] = await treasuryAssets(dasUmi, operator, 1);
      if (!asset) return fail("No cNFTs left in the treasury");
      const assetWithProof = await getAssetWithProof(dasUmi, asset.id, { truncateCanopy: true });
      // Send through SEND_RPC but confirm through the official RPC: publicnode lands
      // transactions yet often reports "block height exceeded" for ones that finalized.
      const tx = await transfer(umi, {
        ...assetWithProof,
        leafOwner: umi.identity.publicKey,
        newLeafOwner: to,
      }).buildAndSign(umi);
      const signature = sig58(await umi.rpc.sendTransaction(tx, { skipPreflight: true, maxRetries: 3 }));
      let status = null;
      // A transfer usually confirms in ~1 s: check early twice, then every 2 s as
      // before, so the official RPC (rate-limited) sees almost the same load and
      // the overall wait stays ~60 s.
      const delays = [700, 700, ...Array(29).fill(2000)];
      for (let i = 0; i < delays.length && !status; i++) {
        await new Promise((r) => setTimeout(r, delays[i]));
        const res = await fetch(RPC, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSignatureStatuses", params: [[signature], { searchTransactionHistory: true }] }),
        }).then((r) => r.json()).catch(() => null);
        const v = res?.result?.value?.[0];
        if (v && (v.confirmationStatus === "confirmed" || v.confirmationStatus === "finalized")) status = v;
      }
      if (!status) {
        return ok({ assetId: asset.id.toString(), to: to.toString(), signature, pending: true,
          warning: "Sent; not confirmed within 60 s. Check ownership (DAS) before retrying." });
      }
      if (status.err) return fail(`Transfer ${signature} failed on-chain: ${JSON.stringify(status.err)}`);
      const result = { assetId: asset.id.toString(), to: to.toString(), signature, status: status.confirmationStatus };
      console.log("[effisend-nft-solana] distribute", JSON.stringify(result));
      return ok(result);
    }

    return fail(`Unknown action ${action}`);
  } catch (error) {
    console.error("[effisend-nft-solana]", action, error.message);
    return fail(error.message);
  }
};
