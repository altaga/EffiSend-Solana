import packageJson from "../../package.json";

export const refreshTime = 1000 * 30;
export const versionFlag = true;
export const appVersion = packageJson.version;

export const COMPATIBLE_STABLECOINS = {
  USDC: [
    "Linea", 
    "Base", 
    "Solana", 
    "Monad", 
    "Starknet", 
    "Arbitrum", 
    "Optimism", 
    "Ethereum", 
    "Scroll", 
    "Polygon", 
    "Worldchain", 
    "BNB", 
    "Hyper EVM", 
    "AVAX", 
    "Sonic"
  ],
  USDT: [
    "Linea",
    "Base", 
    "Monad",
    "Solana", 
    "Starknet",
    "Arbitrum",
    "Optimism", 
    "Ethereum", 
    "Scroll", 
    "Polygon",
    "BNB", 
    "AVAX",
    "Sonic"
  ]
};
