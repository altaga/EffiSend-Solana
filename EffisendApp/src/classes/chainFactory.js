// src/ChainFactory.js
import { EVMChain } from "./evmChain";
import { HederaChain } from "./hederaChain";
import { SolanaChain } from "./solanaChain";
import { StarknetChain } from "./starknetChain";

export class ChainFactory {
  static create(config) {
    switch (config.type) {
      case "evm":
        return new EVMChain(config);
      case "hedera":
        return new HederaChain(config);
      case "solana":
        return new SolanaChain(config);
      case "starknet":
        return new StarknetChain(config);
      default:
        throw new Error(
          `[ChainFactory] Unsupported chain type: ${config.type}`,
        );
    }
  }
}
