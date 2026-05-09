// src/chains/evm/EVMChain.js
import { Contract } from "ethers";
import { abiBatchNFT } from "../contracts/batchNFT";
import { abiBatchTokenBalances } from "../contracts/batchTokenBalances";
import { safeFormatUnits, setupProvider } from "../core/utils";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export class EVMChain {
  constructor(config) {
    this.#validateConfig(config);
    this.config = config;
    this.provider = setupProvider(config.rpcs, config.chainId);

    this.batchContract = new Contract(
      config.batchBalancesAddress,
      abiBatchTokenBalances,
      this.provider,
    );
  }

  async getBalances(userAddress) {
    // 1. Separate Native vs ERC20 tokens
    const nativeToken = this.config.tokens.find(
      (t) => t.address === ZERO_ADDRESS,
    );
    const erc20Tokens = this.config.tokens.filter(
      (t) => t.address !== ZERO_ADDRESS,
    );
    const erc20Addresses = erc20Tokens.map((t) => t.address);

    try {
      // 2. Fetch data in parallel
      const [nativeBalance, erc20Balances] = await Promise.all([
        // Only fetch native if it exists in config
        nativeToken
          ? this.provider.getBalance(userAddress)
          : Promise.resolve(0n),
        // Only fetch ERC20s if array is not empty
        erc20Addresses.length > 0
          ? this.batchContract.batchBalanceOf(userAddress, erc20Addresses)
          : Promise.resolve([]),
      ]);

      // 3. Map results back to the original order of this.config.tokens
      return this.config.tokens.map((token) => {
        if (token.address === ZERO_ADDRESS) {
          return safeFormatUnits(nativeBalance, token.decimals);
        }

        // Find the index in the ERC20 subset to get the correct result
        const indexInSubset = erc20Tokens.findIndex(
          (t) => t.address === token.address,
        );
        if (indexInSubset === -1) return "0";

        const rawBalance = erc20Balances[indexInSubset] ?? 0n;
        return safeFormatUnits(rawBalance, token.decimals);
      });
    } catch (error) {
      console.error("[EVMChain] Error fetching balances:", error);
      // Return 0s on catastrophe
      return this.config.tokens.map(() => "0");
    }
  }

  #validateConfig(config) {
    if (!config?.rpcs?.length) throw new Error("EVMChain requires rpcs array.");
    if (!config.batchBalancesAddress)
      throw new Error("EVMChain requires batchBalancesAddress.");
    if (!Array.isArray(config.tokens))
      throw new Error("EVMChain requires tokens array.");
  }

  async getNFTs(userAddress, contractAddress) {
    try {
      const contract = new Contract(
        contractAddress,
        abiBatchNFT,
        this.provider,
      );
      const balance = await contract.balanceOf(userAddress);
      const nftCount = Number(balance);
      if (nftCount === 0) return [];

      // Get the base URI
      let rawUri = await contract.tokenURI(0);
      let httpUri = rawUri.replace("ipfs://", "https://ipfs.io/ipfs/");

      const nftArray = await Promise.all(
        Array.from({ length: nftCount }, async (_, i) => {
          try {
            let targetUri = httpUri;

            // If the URI doesn't point to a specific .json file,
            // construct it using the token ID
            if (!targetUri.endsWith(".json")) {
              // Ensure there's a trailing slash before appending
              const separator = targetUri.endsWith("/") ? "" : "/";
              targetUri = `${targetUri}${separator}${i}.json`;
            }

            const response = await fetch(targetUri);
            const metadata = await response.json();

            return {
              ...metadata,
              name: metadata.name.includes("#")
                ? metadata.name
                : `${metadata.name} #${i + 1}`,
              image: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
              description: metadata.description,
              attributes: Array.isArray(metadata.attributes)
                ? metadata.attributes
                : [],
              tokenId: i,
            };
          } catch (fetchError) {
            console.error(
              `Error fetching metadata for token ${i}:`,
              fetchError,
            );
            return null;
          }
        }),
      );

      // Filter out any failed fetches
      return nftArray.filter((nft) => nft !== null);
    } catch (error) {
      console.error("[EVMChain] Error fetching NFTs:", error);
      return [];
    }
  }
}
