import { Buffer } from "buffer";
import { hedged } from "../core/rpcRegistryCore";
import { serverBalances } from "../core/serverBalances";
import { safeFormatUnits, signedApiPost } from "../core/utils";
import { address, createSolanaRpc } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata-kit";

const SOL_MINT = "So11111111111111111111111111111111111111111";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const RPC_TIMEOUT_MS = 5000;
// Keyless RPCs that answer plain account reads from a browser (checked 2026-09-28).
// Balances only: they're appended after the chain's list, never used for history.
const BALANCE_RPCS = ["https://solana-rpc.publicnode.com", "https://rpc.solanatracker.io/public"];

// @solana/kit accepts an AbortSignal per call, but a hung RPC (connection open,
// no reply) never rejects on its own — without this, getBalances' race below
// would just wait forever on that one RPC instead of moving to the next.
function timeoutSignal(ms = RPC_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, abort: () => controller.abort(), clear: () => clearTimeout(timer) };
}

export class SolanaChain {
  constructor(config) {
    this.#validateConfig(config);
    this.config = config;
    this.rpcs = [...config.rpcs];
  }

  // Mints of the owner's NFTs (amount 1, 0 decimals). The owner-wide scan this needs
  // is refused by most keyless RPCs in a browser: try the browser's list, then the
  // server (/api/solanaNftMints: free official RPCs first, paid last).
  async #nftMints(walletAddress) {
    for (const rpcUrl of this.rpcs) {
      const call = timeoutSignal();
      try {
        const res = await createSolanaRpc(rpcUrl)
          .getTokenAccountsByOwner(address(walletAddress), { programId: address(TOKEN_PROGRAM_ID) }, { encoding: "jsonParsed" })
          .send({ abortSignal: call.signal });
        const mints = (res?.value || [])
          .filter((acc) => {
            const info = acc?.account?.data?.parsed?.info;
            return (info?.tokenAmount?.uiAmount === 1 || info?.tokenAmount?.uiAmount === "1") && info?.tokenAmount?.decimals === 0;
          })
          .map((acc) => acc?.account?.data?.parsed?.info?.mint);
        return { mints, rpcUrl };
      } catch {
        // refused / rate-limited / down: next one
      } finally {
        call.clear();
      }
    }
    const out = await signedApiPost("/api/solanaNftMints", { owner: walletAddress });
    if (!Array.isArray(out?.mints)) throw new Error(out?.error || "no RPC could list the NFTs");
    return { mints: out.mints, rpcUrl: null };
  }

  async getNFTs(walletAddress) {
    let found;
    try {
      found = await this.#nftMints(walletAddress);
    } catch (e) {
      console.warn(`[Solana] NFT listing failed:`, e.message);
      return [];
    }
    const nftMints = found.mints;
    if (nftMints.length === 0) return [];
    // Metadata is a plain account read every RPC serves: the one that listed the
    // mints first, then the rest.
    const metadataRpcs = found.rpcUrl ? [found.rpcUrl, ...this.rpcs.filter((u) => u !== found.rpcUrl)] : this.rpcs;
    for (const rpcUrl of metadataRpcs) {
      try {
        const rpc = createSolanaRpc(rpcUrl);
        const nfts = [];
        for (const mint of nftMints) {
          try {
            // 2. Fetch Metaplex Metadata directly in browser
            const metadata = await fetchMetadataFromSeeds(rpc, { 
              mint: address(mint) 
            });

            if (!metadata) continue;

            const name = (metadata.data.name || "").replace(/\0/g, "").trim();
            const symbol = (metadata.data.symbol || "").replace(/\0/g, "").trim();
            const uri = (metadata.data.uri || "").replace(/\0/g, "").trim();

            let offChainData = {};
            if (uri) {
              try {
                const metaRes = await fetch(uri.replace("ipfs://", "https://ipfs.io/ipfs/"));
                if (metaRes.ok) {
                  offChainData = await metaRes.json();
                }
              } catch (e) {
                console.warn(`[Solana] Off-chain JSON fail for ${mint}:`, e.message);
              }
            }

            nfts.push({
              name: name || `Solana NFT ${mint.slice(0, 4)}`,
              symbol: symbol || "NFT",
              image: (offChainData?.image || "").replace("ipfs://", "https://ipfs.io/ipfs/") || "https://effisend.com/assets/img/placeholder-nft.png",
              description: offChainData?.description || "Solana NFT",
              mint,
              contract: mint, 
              tokenId: "0",
              chain: "solana",
              ...offChainData
            });

            // Throttle to avoid rate limits
            await new Promise(r => setTimeout(r, 50));
          } catch (e) {
            console.warn(`[Solana] Metadata fail for ${mint}:`, e.message);
            // Minimal fallback
            nfts.push({
              name: `Solana NFT ${mint.slice(0, 4)}`,
              symbol: "NFT",
              image: "https://effisend.com/assets/img/placeholder-nft.png",
              description: "Solana NFT",
              mint,
              contract: mint,
              tokenId: "0",
              chain: "solana"
            });
          }
        }
        
        if (nfts.length > 0) return nfts;
        continue;
      } catch (e) {
        console.warn(`[Solana] RPC ${rpcUrl} failed:`, e.message);
        continue;
      }
    }
    return [];
  }

  // Each token's associated token account (derived from owner + mint, no RPC), cached.
  async #tokenAccounts(walletAddress) {
    this.ataCache ??= new Map();
    if (!this.ataCache.has(walletAddress)) {
      const owner = address(walletAddress);
      const tokens = this.config.tokens.filter((t) => t.address !== SOL_MINT);
      const atas = await Promise.all(
        tokens.map((t) => findAssociatedTokenPda({ owner, mint: address(t.address), tokenProgram: TOKEN_PROGRAM_ADDRESS }).then(([ata]) => ata)),
      );
      this.ataCache.set(walletAddress, new Map(tokens.map((t, i) => [t.address, atas[i]])));
    }
    return this.ataCache.get(walletAddress);
  }

  async getBalances(walletAddress) {
    // One getMultipleAccounts for the wallet itself (SOL) and each token's associated
    // account: plain account reads that every public RPC serves. The owner-wide scan
    // (getTokenAccountsByOwner) is refused by nearly every keyless RPC in a browser,
    // which left one rate-limited endpoint for all Solana balances. Tokens always
    // land in the associated account (our Lambdas, Jupiter, CCTP and wallets send there).
    const atas = await this.#tokenAccounts(walletAddress);
    const keys = [walletAddress, ...atas.values()];
    const rpcs = [...new Set([...this.rpcs, ...BALANCE_RPCS])];

    // Staggered, not all at once: one RPC at a time, moving on at once when it fails
    // and hedging to the next if it hasn't answered in 700 ms (see hedged()).
    // Each call has its own timeout: a hung RPC can never stall the read.
    const attempt = async (rpcUrl, cancel) => {
      const rpc = createSolanaRpc(rpcUrl);
      const call = timeoutSignal();
      cancel.addEventListener("abort", call.abort);
      try {
        const res = await rpc
          .getMultipleAccounts(keys.map((k) => address(k)), { encoding: "jsonParsed" })
          .send({ abortSignal: call.signal });
        const accounts = res?.value;
        if (!Array.isArray(accounts) || accounts.length !== keys.length) throw new Error("bad getMultipleAccounts reply");
        const solBalance = safeFormatUnits(accounts[0]?.lamports ?? 0n, 9);
        const byAta = new Map(keys.map((k, i) => [k, accounts[i]]));
        return this.config.tokens.map((token) => {
          if (token.address === SOL_MINT) return solBalance;
          const info = byAta.get(atas.get(token.address))?.data?.parsed?.info;
          // No account yet = never received this token = 0.
          return info?.mint === token.address ? info.tokenAmount?.uiAmountString || "0" : "0";
        });
      } finally {
        call.clear();
        cancel.removeEventListener("abort", call.abort);
      }
    };

    try {
      return await hedged(rpcs, attempt);
    } catch (aggregate) {
      console.warn(
        `[SolanaChain] (${this.config.network}) every browser RPC failed, asking the server:`,
        aggregate.errors?.map((e) => e.message) ?? [aggregate.message],
      );
      return serverBalances(this.config, walletAddress); // throws if that fails too: never a fake zero
    }
  }

  #buildMintMap(tokenAccounts) {
    const map = new Map();
    for (const acc of tokenAccounts) {
      const info = acc?.account?.data?.parsed?.info;
      if (!info) continue;
      const mint = info.mint;
      const amount = info.tokenAmount?.uiAmountString;
      if (mint && amount) map.set(mint, amount);
    }
    return map;
  }

  #shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  #validateConfig(config) {
    if (!config?.rpcs?.length) throw new Error("MISSING_RPCS");
    if (!Array.isArray(config.tokens)) throw new Error("MISSING_TOKENS");
  }
}