import { Buffer } from "buffer";
import { safeFormatUnits } from "../core/utils";
import { address, createSolanaRpc } from "@solana/kit";
import { fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata-kit";

const SOL_MINT = "So11111111111111111111111111111111111111111";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export class SolanaChain {
  constructor(config) {
    this.#validateConfig(config);
    this.config = config;
    this.rpcs = [...config.rpcs];
  }

  async getNFTs(walletAddress) {
    for (const rpcUrl of this.rpcs) {
      try {
        const rpc = createSolanaRpc(rpcUrl);
        const tokenAccountsResponse = await rpc.getTokenAccountsByOwner(
          address(walletAddress),
          { programId: address(TOKEN_PROGRAM_ID) },
          { encoding: "jsonParsed" }
        ).send();

        const accounts = tokenAccountsResponse?.value || [];
        const nftMints = accounts
          .filter(acc => {
            const info = acc?.account?.data?.parsed?.info;
            return (info?.tokenAmount?.uiAmount === 1 || info?.tokenAmount?.uiAmount === "1") && 
                   (info?.tokenAmount?.decimals === 0);
          })
          .map(acc => acc?.account?.data?.parsed?.info?.mint);

        if (nftMints.length === 0) return [];

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

  async getBalances(walletAddress) {
    for (const rpcUrl of this.rpcs) {
      try {
        const rpc = createSolanaRpc(rpcUrl);
        
        // 1. SOL Balance
        const solBalanceResponse = await rpc.getBalance(address(walletAddress)).send();
        
        // 2. SPL Token Accounts
        const tokenAccountsResponse = await rpc.getTokenAccountsByOwner(
          address(walletAddress),
          { programId: address(TOKEN_PROGRAM_ID) },
          { encoding: "jsonParsed" }
        ).send();

        const solLamports = solBalanceResponse?.value || 0;
        const solBalance = safeFormatUnits(solLamports, 9);
        const tokenAccounts = tokenAccountsResponse?.value || [];
        const mintMap = this.#buildMintMap(tokenAccounts);

        return this.config.tokens.map((token) => {
          if (token.address === SOL_MINT) return solBalance;
          return mintMap.get(token.address) || "0";
        });
      } catch (e) {
        console.warn(`RPC ${rpcUrl} failed, trying next...`, e);
        continue;
      }
    }
    return this.config.tokens.map(() => "0");
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