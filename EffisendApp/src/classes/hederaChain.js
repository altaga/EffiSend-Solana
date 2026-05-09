import { safeFormatUnits } from "../core/utils";
export class HederaChain {
  constructor(config) {
    this.#validateConfig(config);
    this.config = config;
    this.api = "https://mainnet-public.mirrornode.hedera.com/api/v1";
  }
  async getBalances(accountId) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${this.api}/accounts/${accountId}`, {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Mirror node error: ${response.status}`);
      const data = await response.json();
      const nativeBalance = data?.balance?.balance ?? "0";
      const tokenList = Array.isArray(data?.balance?.tokens)
        ? data.balance.tokens
        : [];
      return this.config.tokens.map((token) => {
        if (token.accountId==="0.0.000000") return safeFormatUnits(nativeBalance, 8);
        const found = tokenList.find((t) => t.token_id === token.accountId);
        if (!found) return safeFormatUnits("0", token.decimals);
        return safeFormatUnits(found.balance, token.decimals);
      });
    } catch (error) {
      console.error("[HederaChain] Fetch failed:", error);
      return this.config.tokens.map(() => "0");
    } finally {
      clearTimeout(timeout);
    }
  }
  #validateConfig(config) {
    if (!Array.isArray(config?.tokens))
      throw new Error("HederaChain requires tokens array.");
  }
}
