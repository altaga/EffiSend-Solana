import { Ionicons } from "@expo/vector-icons";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { EVMChain } from "../../../classes/evmChain";
import { HederaChain } from "../../../classes/hederaChain";
import { SolanaChain } from "../../../classes/solanaChain";
import { StarknetChain } from "../../../classes/starknetChain";
import FaceOnboarding from "../../../components/faceOnboarding";
import { blockchains, getIcon } from "../../../core/chains";
import { refreshTime } from "../../../core/constants";
import { createGlobalStyles, mainColor } from "../../../core/styles";
import {
  arraySum,
  epsilonRound,
  fetchWithRetries,
  getAsyncStorageValue,
  setAsyncStorageValue,
} from "../../../core/utils";

import ContextModule from "../../../providers/contextModule";
import { useSmartSize } from "../../../providers/smartProvider";

const adapterMap = {
  evm: EVMChain,
  starknet: StarknetChain,
  hedera: HederaChain,
  solana: SolanaChain,
};

const smartFormat = (val) => {
  if (val === 0) return "0";
  const absVal = Math.abs(val);
  if (absVal < 0.0001) {
    return val.toExponential(2);
  }
  if (absVal < 1) {
    return val.toFixed(4);
  }
  if (absVal >= 1000) {
    return Math.round(val).toLocaleString();
  }
  return val.toFixed(2);
};

function Tab4({ navigation, isActive }) {
  const context = useContext(ContextModule);
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const { balances, usdConversion, addresses } = context.value;
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const abortControllersRef = useRef([]);

  const getLastRefresh = async () => {
    try {
      const value = await getAsyncStorageValue("lastRefresh");
      if (!value) throw new Error();
      return Number(value);
    } catch {
      await setAsyncStorageValue({ lastRefresh: 0 });
      return 0;
    }
  };

  const getUSD = useCallback(async () => {
    const controller = new AbortController();
    abortControllersRef.current.push(controller);
    const allIds = blockchains.flatMap((chain) =>
      chain.tokens.map((t) => t.coingecko),
    );
    const uniqueIds = [...new Set(allIds)];
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds.join(",")}&vs_currencies=usd`;
    const response = await fetchWithRetries(
      url,
      { method: "GET", signal: controller.signal },
      { retries: 3, delay: 1000, backoff: 2 },
    );
    const result = await response.json();
    const conversion = blockchains.map((chain) =>
      chain.tokens.map((token) => result[token.coingecko]?.usd ?? 0),
    );
    context.setValue({ usdConversion: conversion });
    await setAsyncStorageValue({ usdConversion: conversion });
  }, [context]);

  useEffect(() => {
    if (isActive) {
      console.log("Tab 4 is active");
    }
  }, [isActive]);

  const getBalances = useCallback(async () => {
    const balancesResult = await Promise.all(
      blockchains.map(async (chain) => {
        try {
          const address = addresses[chain.type];
          if (!address) return chain.tokens.map(() => 0);
          const Adapter = adapterMap[chain.type];
          if (!Adapter) return chain.tokens.map(() => 0);
          const adapter = new Adapter(chain);
          const result = await adapter.getBalances(address);
          console.log(`${chain.network} Synced`);
          return result.map((x) => Number(x) || 0);
        } catch (err) {
          return chain.tokens.map(() => 0);
        }
      }),
    );
    context.setValue({ balances: balancesResult });
    await setAsyncStorageValue({ balances: balancesResult });
  }, [addresses, context]);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setRefreshing(true);
    try {
      await Promise.all([getUSD(), getBalances()]);
      await setAsyncStorageValue({ lastRefresh: Date.now() });
    } catch (err) {
    }
    setRefreshing(false);
    isRefreshingRef.current = false;
  }, [getUSD, getBalances]);

  useEffect(() => {
    let intervalId;
    if (isActive) {
      const ready = Object.values(addresses).some((a) => a !== "");
      if (ready) {
        (async () => {
          const lastRefresh = await getLastRefresh();
          if (Date.now() - lastRefresh >= refreshTime) {
            refresh();
          }
        })();
        intervalId = setInterval(() => {
          refresh();
        }, refreshTime);
      }
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive, addresses, refresh]);

  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      controllers.forEach((c) => c.abort());
    };
  }, []);

  const totalUSD = useMemo(() => {
    return epsilonRound(
      arraySum(
        balances.flatMap((chainBalances, chainIndex) =>
          chainBalances.map(
            (bal, tokenIndex) =>
              bal * (usdConversion[chainIndex]?.[tokenIndex] ?? 0),
          ),
        ),
      ),
      2,
    );
  }, [balances, usdConversion]);

  const actions = [
    { id: "send", icon: "arrow-up-outline", label: "Send", disabled: true },
    {
      id: "receive",
      icon: "arrow-down-outline",
      label: "Receive",
      disabled: false,
    },
    { id: "swap", icon: "repeat-outline", label: "Swap", disabled: false },
    { id: "charge", icon: "cash-outline", label: "Charge", disabled: false },
  ];


  return Object.values(addresses).some((a) => a !== "") ? (
    <View style={{ flex: 1, height: "100%", width: smartSize.width, alignSelf: "center", backgroundColor: "#000", overflow: "hidden" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#FFFFFF"
          />
        }
        contentContainerStyle={GlobalStyles.tab4ScrollContent}
      >
        <View style={{
          width: "100%",
          height: normalize(40),
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: normalize(20)
        }}>
          <View style={{ width: normalize(28) }}>
            {context.value.pincode === null && (
              <Pressable
                onPress={() => {
                  navigation.navigate("(screens)/pincode")
                }}
              >
                <Ionicons name="lock-closed-outline" size={normalize(24)} color={"white"} />
              </Pressable>
            )}
          </View>


          <Pressable
            onPress={() => navigation.navigate("(screens)/cards")}
          >
            <Ionicons name="card-outline" size={normalize(28)} color={"white"} />
          </Pressable>
        </View>


        <View style={GlobalStyles.tab4HeaderSection}>
          <Text style={GlobalStyles.tab4BalanceLabel}>Current Balance</Text>
          <Text style={GlobalStyles.tab4BalanceText}>${totalUSD} USD</Text>
        </View>

        <View style={GlobalStyles.tab4ActionsRow}>
          {actions.map((action) => (
            <Pressable
              key={action.id}
              disabled={action.disabled}
              onPress={() =>
                !action.disabled &&
                navigation.navigate(`(screens)/${action.id}`)
              }
              style={({ pressed }) => [
                GlobalStyles.tab4ActionItem,
                { opacity: action.disabled ? 0.3 : pressed ? 0.7 : 1 },
              ]}
            >
              <View style={GlobalStyles.tab4ActionCircle}>
                <Ionicons name={action.icon} size={22} color={mainColor} />
              </View>
              <Text style={GlobalStyles.tab4ActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ width: "100%" }}>
          {blockchains
            .flatMap((chain, chainIndex) =>
              chain.tokens.map((token, tokenIndex) => ({
                token,
                tokenIndex,
                chainIndex,
                chain,
                balance: balances[chainIndex]?.[tokenIndex] ?? 0,
                price: usdConversion[chainIndex]?.[tokenIndex] ?? 0,
              })),
            )
            .filter(({ token, balance, chain }) => {
              const isNative = token.symbol === chain.token;
              return isNative || Number(balance) > 0;
            })
            .sort(
              (a, b) =>
                Number(b.balance) * b.price - Number(a.balance) * a.price,
            )
            .map(({ token, tokenIndex, chainIndex, chain, balance, price }) => {
              const totalValueUsd = Number(balance) * price;
              const amountStr = Number(balance) === 0
                ? "0"
                : Number(balance) < 0.001
                  ? "<0.001"
                  : epsilonRound(balance, 3);

              return (
                <View
                  key={`${chainIndex}-${tokenIndex}`}
                  style={GlobalStyles.tab4AssetCard}
                >
                  <View style={GlobalStyles.tab4AssetLeft}>
                    <View style={GlobalStyles.tab4IconContainer}>
                      <View style={GlobalStyles.tab4MainIcon}>
                        {token.icon}
                      </View>
                      <View style={GlobalStyles.tab4BadgeContainer}>
                        {getIcon(chain.iconKey, 18)}
                      </View>
                    </View>
                    <View style={GlobalStyles.tab4AssetInfo}>
                      <Text
                        style={GlobalStyles.tab4AssetName}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        ellipsizeMode="tail"
                      >
                        {token.name}
                      </Text>
                      <Text
                        style={GlobalStyles.tab4AssetSubtext}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {smartFormat(price)} USD
                      </Text>
                    </View>
                  </View>
                  <View style={GlobalStyles.tab4AssetRight}>
                    <Text style={GlobalStyles.tab4AssetValue}>
                      {amountStr} {token.symbol}
                    </Text>
                    <Text style={GlobalStyles.tab4AssetValueSmall}>
                      $ {smartFormat(totalValueUsd)} USD
                    </Text>
                  </View>
                </View>
              );
            })}
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={{ flex: 1, height: "100%", width: smartSize.width, alignSelf: "center", backgroundColor: "#000", overflow: "hidden" }}>
      <FaceOnboarding onStart={() => navigation.navigate("(screens)/create")} />
    </View>
  );
}

export default Tab4;