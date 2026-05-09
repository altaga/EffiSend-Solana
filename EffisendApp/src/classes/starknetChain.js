// src/chains/starknet/StarknetChain.js
import { CallData, RpcProvider } from "starknet";
import { safeFormatUnits } from "../core/utils";

/**
 * Interceptor to fake the starknet_specVersion handshake.
 * This prevents starknet.js from blocking calls on nodes that are slightly out of date.
 */
const customFetch = async (input, init) => {
  if (init && init.body) {
    try {
      const bodyStr = init.body.toString();
      // Intercept only the specVersion check
      if (bodyStr.includes('"starknet_specVersion"')) {
        const parsedBody = JSON.parse(bodyStr);
        // Return a mocked successful JSON-RPC response
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: parsedBody.id,
          result: "0.8.1" // The exact version starknet.js v9 expects
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (e) {
      // If JSON parsing fails, just ignore and let the real fetch handle it
    }
  }
  return fetch(input, init);
};

/**
 * StarknetChain Implementation
 * Compatible with Starknet.js v9.4.2
 */
export class StarknetChain {
  constructor(config) {
    this.#validateConfig(config);
    this.config = config;

    // Initialize providers with the robust configuration
    this.providers = config.rpcs.map(
      (url) => new RpcProvider({
        nodeUrl: url,
        blockIdentifier: "latest", // Fixes "pending" block issues
        fetch: customFetch         // Fixes version handshake issues
      }),
    );
  }

  async getBalances(userAddress) {
    const accumulatedResults = {};
    const tokensToFetch = [...this.config.tokens];

    /**
     * Recursive granular fetcher (Internal)
     * Parallel Fallback: Fires all tokens simultaneously. If any fail, batches failures for next RPC.
     */
    const fetchWithFallback = async (remainingTokens, rpcIndex = 0) => {
      if (remainingTokens.length === 0) return;

      if (rpcIndex >= this.providers.length) {
        console.warn("🚨 StarknetChain: All RPCs exhausted. Some balances could not be fetched.");
        remainingTokens.forEach(t => {
          if (!accumulatedResults[t.address]) accumulatedResults[t.address] = "0";
        });
        return;
      }

      const provider = this.providers[rpcIndex];
      const rpcUrl = this.config.rpcs[rpcIndex];
      const failedTokens = [];

      const compiledCalldata = CallData.compile([userAddress]);

      // 🔥 CLIENT-SIDE MULTICALL: Fire all requests simultaneously!
      const fetchPromises = remainingTokens.map(async (token) => {
        if (!token.address) {
          accumulatedResults[token.address] = "0";
          return;
        }

        try {
          let response;
          // Try camelCase first
          try {
            response = await provider.callContract({
              contractAddress: token.address,
              entrypoint: "balanceOf",
              calldata: compiledCalldata
            });
          } catch {
            // Fallback to snake_case if camelCase fails
            response = await provider.callContract({
              contractAddress: token.address,
              entrypoint: "balance_of",
              calldata: compiledCalldata
            });
          }

          const resArray = Array.isArray(response) ? response : (response.result || response);
          const rawBalance = this.#extractBalance(resArray);

          // Safely map the successful result
          accumulatedResults[token.address] = safeFormatUnits(rawBalance, token.decimals);

        } catch (error) {
          console.warn(`❌ [${token.symbol}] failed on RPC ${rpcUrl}: ${error.message.substring(0, 50)}`);
          // Mark this specific token for the next RPC fallback
          failedTokens.push(token);
        }
      });

      // Wait for all parallel queries to settle
      await Promise.all(fetchPromises);

      // If any tokens failed, pass ONLY the failed ones to the next RPC
      if (failedTokens.length > 0) {
        await fetchWithFallback(failedTokens, rpcIndex + 1);
      }
    };

    await fetchWithFallback(tokensToFetch, 0);

    // Map back to the original token order for the UI
    return this.config.tokens.map(token => accumulatedResults[token.address] || "0");
  }

  /**
   * Robust balance extraction for Starknet.js v9
   * Handles direct BigInt, {low, high} objects, and nested balance objects.
   */
  #extractBalance(result) {
    if (result === undefined || result === null) return 0n;

    // Handle felt array from low-level callContract [low, high]
    if (Array.isArray(result)) {
      if (result.length >= 2) {
        // Uint256: low is first, high is second
        return (BigInt(result[1]) << 128n) + BigInt(result[0]);
      }
      if (result.length === 1) {
        return BigInt(result[0]);
      }
      return 0n;
    }

    // Modern v9 returns BigInt directly for u256
    if (typeof result === "bigint") return result;
    if (typeof result === "number") return BigInt(result);

    // Handle nested results if applicable
    if (result.balance !== undefined) return this.#extractBalance(result.balance);

    // Legacy support for {low, high} Uint256
    if (result.low !== undefined && result.high !== undefined) {
      return (BigInt(result.high) << 128n) + BigInt(result.low);
    }

    return 0n;
  }

  #validateConfig(config) {
    if (!config?.rpcs?.length)
      throw new Error("StarknetChain requires rpcs array.");
    if (!Array.isArray(config.tokens))
      throw new Error("StarknetChain requires tokens array.");
  }
}