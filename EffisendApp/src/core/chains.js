import { Image } from "expo-image";
import { useSmartSize } from "../providers/smartProvider";
import { ASSETS } from "./assets";

const IconComponent = ({ symbol, size }) => {
  const { normalize } = useSmartSize();
  const key = symbol.toLowerCase();
  const source = ASSETS[key];

  if (!source) {
    return null;
  }

  const finalSize = normalize(size);

  return (
    <Image
      source={source}
      style={{
        width: finalSize,
        height: finalSize,
        borderRadius: finalSize,
      }}
    />
  );
};

export const getIcon = (symbol, size = 50, asSource = false) => {
  if (asSource) {
    return ASSETS[symbol.toLowerCase()] || null;
  }
  return <IconComponent symbol={symbol} size={size} />;
};

export const iconsBlockchain = Object.keys(ASSETS).reduce((acc, key) => {
  acc[key] = getIcon(key);
  return acc;
}, {});

export const blockchains = [
  {
    enabled: true,
    network: "Base",
    type: "evm",
    token: "ETH",
    chainId: 8453,
    iconKey: "base",
    blockExplorer: "https://basescan.org/",
    rpcs: [
      "https://base-rpc.publicnode.com",
      "https://developer-access-mainnet.base.org",
      "https://mainnet.base.org",
      "https://base.drpc.org",
      "https://base.llamarpc.com",
      "https://base.gateway.tenderly.co",
      "https://1rpc.io/base",
      "https://base-mainnet.public.blastapi.io",
    ],
    decimals: 18,
    batchBalancesAddress: "0x31C0e6E622116EE00e8d6DbBf845759BE17e6D93",
    color: "#0052ff",
    tokens: [
      {
        name: "Ethereum",
        symbol: "ETH",
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        icon: getIcon("eth"),
        coingecko: "ethereum",
        color: "#0052ff",
      },
      {
        name: "USD Coin",
        symbol: "USDC",
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
        icon: getIcon("usdc"),
        coingecko: "usd-coin",
        color: "#0b53bf",
      },
      {
        name: "Euro Coin",
        symbol: "EURC",
        address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
        decimals: 6,
        icon: getIcon("eurc"),
        coingecko: "euro-coin",
        color: "#053494",
      },
      {
        name: "Coinbase Wrapped BTC",
        symbol: "cbBTC",
        address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
        decimals: 8,
        icon: getIcon("cbbtc"),
        coingecko: "coinbase-wrapped-btc",
        color: "#ffaf20",
      },
      {
        name: "Wrapped ETH",
        symbol: "WETH",
        address: "0x4200000000000000000000000000000000000006",
        decimals: 18,
        icon: getIcon("weth"),
        coingecko: "weth",
        color: "#ffffff",
      },
      {
        name: "ChainLink Token",
        symbol: "LINK",
        address: "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196",
        decimals: 18,
        icon: getIcon("link"),
        coingecko: "chainlink",
        color: "#052df3",
      },
    ],
  }, // Base
  {
    enabled: true,
    network: "Monad",
    type: "evm",
    token: "MON",
    chainId: 143,
    iconKey: "mon",
    blockExplorer: "https://monadscan.com/",
    rpcs: [
      "https://rpc.monad.xyz",
      "https://rpc.sentio.xyz/monad-mainnet",
      "https://monad-mainnet-rpc.spidernode.net",
      "https://rpc1.monad.xyz",
      "https://rpc3.monad.xyz",
      "https://monad-mainnet.drpc.org",
      "https://rpc2.monad.xyz",
      "https://monad-rpc.huginn.tech",
      "https://gm.monad.at.htw.tech",
    ],
    decimals: 18,
    batchBalancesAddress: "0xdc47Cd88C9634D0f2d5f23BfbFFE0c5e9699E4f9",
    color: "#836ef9",
    tokens: [
      {
        name: "Monad",
        color: "#836ef9",
        symbol: "MON",
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        icon: getIcon("mon"),
        coingecko: "monad",
      },
      {
        name: "USD Coin",
        symbol: "USDC",
        color: "#0b53bf",
        address: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
        decimals: 6,
        icon: getIcon("usdc"),
        coingecko: "usd-coin",
      },
      {
        name: "USD1 WLFI",
        color: "#c27c04",
        symbol: "USD1",
        address: "0x111111d2bf19e43C34263401e0CAd979eD1cdb61",
        decimals: 6,
        icon: getIcon("usd1"),
        coingecko: "usd1-wlfi",
      },
      {
        name: "USDT0 Token",
        color: "#07b589",
        symbol: "USDT0",
        address: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D",
        decimals: 6,
        icon: getIcon("usdt0"),
        coingecko: "usdt0",
      },
      {
        name: "Agora Dollar",
        color: "#9a9350",
        symbol: "AUSD",
        address: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
        decimals: 6,
        icon: getIcon("ausd"),
        coingecko: "agora-dollar",
      },
      {
        name: "Wrapped BTC",
        color: "#fca046",
        symbol: "WBTC",
        address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
        decimals: 8,
        icon: getIcon("wbtc"),
        coingecko: "wrapped-bitcoin",
      },
      {
        name: "Wrapped ETH",
        color: "#ffffff",
        symbol: "WETH",
        address: "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242",
        decimals: 18,
        icon: getIcon("weth"),
        coingecko: "weth",
      },
      {
        name: "Wrapped MONAD",
        color: "#391b97",
        symbol: "WMON",
        address: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
        decimals: 18,
        icon: getIcon("wmon"),
        coingecko: "wrapped-monad",
      },
      {
        name: "Folks",
        color: "#3365b6",
        symbol: "FOLKS",
        address: "0xFF7F8F301F7A706E3CfD3D2275f5dc0b9EE8009B",
        decimals: 6,
        icon: getIcon("folks"),
        coingecko: "folks",
      },
    ],
  }, // Monad
  {
    enabled: true,
    network: "Hedera",
    type: "hedera",
    token: "HBAR",
    iconKey: "hbar",
    blockExplorer: "https://hashscan.io/mainnet/",
    color: "#202020",
    decimals: 8,
    rpcs: [
      "https://mainnet.mirrornode.hedera.com",
      "https://mainnet-public.mirrornode.hedera.com",
    ],
    api: "https://mainnet.mirrornode.hedera.com",
    tokens: [
      {
        name: "Hedera",
        symbol: "HBAR",
        accountId: "0.0.000000",
        decimals: 8,
        coingecko: "hedera-hashgraph",
        icon: getIcon("hbar"),
        color: "#202020",
      },
      {
        name: "USD Coin",
        symbol: "USDC",
        accountId: "0.0.456858",
        decimals: 6,
        coingecko: "usd-coin",
        icon: getIcon("usdc"),
        color: "#2775ca",
      },
      {
        name: "SaucerSwap",
        symbol: "SAUCE",
        accountId: "0.0.731861",
        decimals: 6,
        coingecko: "saucerswap",
        icon: getIcon("saucer"),
        color: "#6bff53",
      },
      {
        name: "ChainLink",
        symbol: "LINK",
        accountId: "0.0.1055495",
        decimals: 8,
        coingecko: "chainlink",
        icon: getIcon("link"),
        color: "#345bce",
      },
      {
        name: "Wrapped AVAX",
        symbol: "WAVAX",
        accountId: "0.0.1157020",
        decimals: 8,
        coingecko: "wrapped-avax",
        icon: getIcon("wavax"),
        color: "#E84142",
      },
      {
        name: "HashPack",
        symbol: "PACK",
        accountId: "0.0.4794920",
        decimals: 6,
        coingecko: "hashpack",
        icon: getIcon("pack"),
        color: "#595b9f",
      },
      {
        name: "HeadStarter",
        symbol: "HST",
        accountId: "0.0.968069",
        decimals: 8,
        coingecko: "headstarter",
        icon: getIcon("hst"),
        color: "#3f61ad",
      },
      {
        name: "Calaxy Tokens",
        symbol: "CLXY",
        accountId: "0.0.859814",
        decimals: 6,
        coingecko: "calaxy",
        icon: getIcon("clxy"),
        color: "#7a04d6",
      },
      {
        name: "Hedera Liquity",
        symbol: "HLQT",
        accountId: "0.0.6070128",
        decimals: 8,
        coingecko: "hedera-liquity",
        icon: getIcon("hlqt"),
        color: "#057ccd",
      },
      {
        name: "STEAM",
        symbol: "STEAM",
        accountId: "0.0.3210123",
        decimals: 2,
        coingecko: "steam",
        icon: getIcon("steam"),
        color: "#2099af",
      },
      {
        name: "Hedera Swiss Franc",
        symbol: "HCHF",
        accountId: "0.0.6070123",
        decimals: 8,
        coingecko: "hedera-swiss-franc",
        icon: getIcon("hchf"),
        color: "#FF0000",
      },
      {
        name: "Karate",
        symbol: "KARATE",
        accountId: "0.0.2283230",
        decimals: 8,
        coingecko: "karate-combat",
        icon: getIcon("karate"),
        color: "#181818",
      },
      {
        name: "Davincigraph",
        symbol: "DAVINCI",
        accountId: "0.0.3706639",
        decimals: 9,
        coingecko: "davincigraph",
        icon: getIcon("davinci"),
        color: "#f4b62f",
      },
      {
        name: "Dovu",
        symbol: "DOVU",
        accountId: "0.0.3716059",
        decimals: 8,
        coingecko: "dovu-2",
        icon: getIcon("dovu"),
        color: "#262626",
      },
      {
        name: "Quant",
        symbol: "QNT",
        accountId: "0.0.1304757",
        decimals: 8,
        coingecko: "quant-network",
        icon: getIcon("qnt"),
        color: "#3b3b3b",
      },
      {
        name: "GRELF",
        symbol: "GRELF",
        accountId: "0.0.1159074",
        decimals: 8,
        coingecko: "grelf",
        icon: getIcon("grelf"),
        color: "#d8aa8c",
      }
    ],
  }, // Hedera
  {
    enabled: true,
    network: "Solana",
    type: "solana",
    token: "SOL",
    iconKey: "sol",
    blockExplorer: "https://solscan.io/",
    rpcs: [
      "https://public.rpc.solanavibestation.com",
      "https://solana.api.pocket.network",
      "https://solana.rpc.laine.co",
    ],
    color: "#9349f1",
    tokens: [
      {
        name: "Solana",
        symbol: "SOL",
        address: "So11111111111111111111111111111111111111111",
        decimals: 9,
        icon: getIcon("sol"),
        coingecko: "solana",
        color: "#9349f1",
      },
      {
        name: "USD Coin",
        symbol: "USDC",
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        decimals: 6,
        icon: getIcon("usdc"),
        coingecko: "usd-coin",
        color: "#2775ca",
      },
      {
        name: "Tether USD",
        symbol: "USDT",
        address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        decimals: 6,
        icon: getIcon("usdt"),
        coingecko: "tether",
        color: "#008e8e",
      },
      {
        name: "Bonk",
        symbol: "BONK",
        address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        decimals: 5,
        icon: getIcon("bonk"),
        coingecko: "bonk",
        color: "#f9de39",
      },
      {
        name: "Wrapped BTC",
        symbol: "BTC",
        address: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
        decimals: 8,
        icon: getIcon("wbtc"),
        coingecko: "wrapped-bitcoin",
        color: "#f8931a",
      },
      {
        name: "Jupiter",
        symbol: "JUP",
        address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
        decimals: 6,
        icon: getIcon("jup"),
        coingecko: "jupiter-exchange-solana",
        color: "#16bede",
      },
    ],
  }, // Solana
  {
    enabled: true,
    network: "Starknet",
    type: "starknet",
    token: "ETH",
    iconKey: "strk",
    blockExplorer: "https://voyager.online/",
    rpcs: [
      "https://starknet-rpc.publicnode.com",
      "https://rpc.starknet.lava.build",
      "https://api.cartridge.gg/x/starknet/mainnet",
    ],
    ozAccountClassHash:
      "0x0540d7f5ec7ecf317e68d48564934cb99259781b1ee3cedbbc37ec5337f8e688",
    batchBalancesAddress: "0xcf4902BC621E97B8d574f1E91c342f0c44C8baE5",
    rewardsContract: "0x04A4e03a1F879DE1F03D3bBBccd9CB9500d6A7e8",
    color: "#29296e",
    tokens: [
      {
        name: "Ether",
        symbol: "ETH",
        address:
          "0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7",
        decimals: 18,
        coingecko: "ethereum",
        icon: getIcon("eth"),
        color: "#28A0F0",
      },
      {
        name: "Starknet Token",
        symbol: "STRK",
        address:
          "0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D",
        decimals: 18,
        coingecko: "starknet",
        icon: getIcon("strk"),
        color: "#29296e",
      },
      {
        name: "Wrapped Bitcoin",
        symbol: "WBTC",
        address:
          "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
        decimals: 8,
        coingecko: "wrapped-bitcoin",
        icon: getIcon("wbtc"),
        color: "#FAB932",
      },
      {
        name: "USD Coin",
        symbol: "USDC",
        address:
          "0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb",
        decimals: 6,
        coingecko: "usd-coin",
        icon: getIcon("usdc"),
        color: "#2775ca",
      },
      {
        name: "Tether USD",
        symbol: "USDT",
        address:
          "0x068F5c6a61780768455de69077E07e89787839bf8166dEcfBf92B645209c0fB8",
        decimals: 6,
        coingecko: "tether",
        icon: getIcon("usdt"),
        color: "#008e8e",
      },
      {
        name: "Dai Stablecoin v0",
        symbol: "DAIv0",
        address:
          "0x00dA114221cb83fa859DBdb4C44bEeaa0BB37C7537ad5ae66Fe5e0efD20E6eB3",
        decimals: 18,
        coingecko: "dai",
        icon: getIcon("dai"),
        color: "#fab932",
      },
      {
        name: "Dai Stablecoin",
        symbol: "DAI",
        address:
          "0x05574eb6b8789a91466f902c380d978e472db68170ff82a5b650b95a58ddf4ad",
        decimals: 18,
        coingecko: "dai",
        icon: getIcon("dai"),
        color: "#fab932",
      },
    ],
  }, // Starknet
];
