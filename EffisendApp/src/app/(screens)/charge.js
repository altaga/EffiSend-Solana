import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { Fragment, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "react-native-sonner";
import VirtualKeypad from "../../components/VirtualKeypad";

import { EVMChain } from "../../classes/evmChain";
import { HederaChain } from "../../classes/hederaChain";
import { SolanaChain } from "../../classes/solanaChain";
import { StarknetChain } from "../../classes/starknetChain";
import CamFace from "../../components/camFace";
import Header from "../../components/header";
import { blockchains, getIcon } from "../../core/chains";
import {
  backgroundColor,
  createGlobalStyles,
  mainColor,
  secondaryColor,
  tertiaryColor,
  whiteColor,
} from "../../core/styles";
import {
  deleteLeadingZeros,
  formatInputText,
  getContrastColor,
  rgbaToHex,
  setAsyncStorageValue,
} from "../../core/utils";
import ContextModule from "../../providers/contextModule";
import { useSmartSize } from "../../providers/smartProvider";

const adapterMap = {
  evm: EVMChain,
  starknet: StarknetChain,
  hedera: HederaChain,
  solana: SolanaChain,
};

const BaseStatePaymentWallet = {
  balances: blockchains.map((chain) => chain.tokens.map(() => 0)),
  activeTokens: blockchains.map((chain) => chain.tokens.map(() => false)),
  stage: 0, // 0
  amount: "",
  kindPayment: 0,
  user: "",
  addresses: {},
  explorerURL: "",
  hash: "",
  transactionDisplay: {
    amount: "0.00",
    name: blockchains[0].tokens[0].symbol,
    icon: blockchains[0].tokens[0].icon,
    networkIconKey: blockchains[0].iconKey,
  },
  take: false,
  loading: false,
  paymentStatus: "idle", // 'idle' | 'processing' | 'completed' | 'failed'
  pin: "",
  pinError: false,
  pinAttempts: 0,
  selectedAsset: null, // { chainIndex, tokenIndex }
  hasPincode: true,
};

export default function Charge() {
  const context = useContext(ContextModule);
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const router = useRouter();
  const navigation = useNavigation();
  const [state, setState] = useState(BaseStatePaymentWallet);
  const updateState = (newState) =>
    setState((prevState) => ({ ...prevState, ...newState }));

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state.loading && state.stage === 4) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state.loading, state.stage, pulseAnim]);

  const handlePinDigit = (digit) => {
    if (state.pin.length < 4) {
      updateState({ pin: state.pin + digit });
    }
  };

  const handlePinBackspace = () => {
    updateState({ pin: state.pin.slice(0, -1) });
  };

  const handleAmountDigit = (digit) => {
    if (digit === ".") {
      if (state.amount.includes(".")) return;
      updateState({ amount: (state.amount || "0") + "." });
    } else {
      if (state.amount === "0") {
        updateState({ amount: digit });
      } else {
        updateState({ amount: state.amount + digit });
      }
    }
  };

  const handleAmountBackspace = () => {
    if (state.amount.length > 1) {
      updateState({ amount: state.amount.slice(0, -1) });
    } else {
      updateState({ amount: "" });
    }
  };

  const payFromAnySource = async (chainIndex, tokenIndex) => {
    try {
      updateState({ loading: true, paymentStatus: "processing" });
      const targetChain = blockchains[chainIndex];
      const targetToken = targetChain.tokens[tokenIndex];
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      const raw = JSON.stringify({
        user: state.user,
        chainType: targetChain.type,
        chainId: targetChain.type === "evm" ? targetChain.chainId : null,
        tokenId:
          targetToken.address || targetToken.accountId || targetToken.symbol,
        amount: (
          state.amount / context.value.usdConversion[chainIndex][tokenIndex]
        ).toFixed(targetToken.decimals),
        to: context.value.addresses[targetChain.type],
      });
      const response = await fetch(`/api/executePayment`, {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      });
      const result = await response.json();
      if (result.error === null) {
        const prefix =
          blockchains[chainIndex].type === "hedera" ? "transaction" : "tx";
        updateState({
          loading: false,
          explorerURL: `${targetChain.blockExplorer}${prefix}/${result.result}`,
          hash: result.result,
          paymentStatus: "completed",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      updateState({ loading: false, paymentStatus: "failed" });
    }
  };

  const verifyPinAndPay = async () => {
    updateState({ loading: true });
    try {
      const response = await fetch("/api/checkPin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: state.user,
          pincode: state.pin
        }),
      });

      const result = await response.json();

      if (result.result === true) {
        updateState({ pinAttempts: 0, stage: 3 });
        await payFromAnySource(state.selectedAsset.chainIndex, state.selectedAsset.tokenIndex);
      } else {
        const newAttempts = state.pinAttempts + 1;
        updateState({ pinError: true, pinAttempts: newAttempts });

        if (newAttempts >= 3) {
          setTimeout(() => {
            updateState({ stage: 0, pin: "", pinError: false, loading: false, pinAttempts: 0 });
            toast.error("Security Reset", { description: "Too many failed attempts. Please restart." });
          }, 1500);
        } else {
          setTimeout(() => {
            updateState({ pin: "", pinError: false, loading: false });
            toast.error("Incorrect PIN", { description: `You have ${3 - newAttempts} attempts remaining.` });
          }, 1500);
        }
      }
    } catch (error) {
      updateState({ loading: false });
      toast.error("Network Error", { description: "Please check your connection." });
    }
  };

  const fetchPayment = async (kind, data) => {
    const raw = JSON.stringify(kind === 0 ? { nonce: data } : { user: data });
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const response = await fetch("/api/fetchPayment", {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    });
    return response.json();
  };

  const getUSD = async () => {
    try {
      const allIds = blockchains.flatMap((chain) =>
        chain.tokens.map((t) => t.coingecko),
      );
      const uniqueIds = [...new Set(allIds)];
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds.join(",")}&vs_currencies=usd`,
        { method: "GET", headers: { accept: "application/json" } },
      );
      const result = await response.json();
      const conversion = blockchains.map((chain) =>
        chain.tokens.map((token) => result[token.coingecko]?.usd ?? 0),
      );
      setAsyncStorageValue({ usdConversion: conversion });
      context.setValue({ usdConversion: conversion });
      return conversion;
    } catch (e) {
      console.warn("Failed to fetch USD prices", e);
      return context.value.usdConversion;
    }
  };

  const getBalances = async (scannedAddresses, usdConversionRates) => {
    const requiredUSD = parseFloat(
      deleteLeadingZeros(formatInputText(state.amount)),
    );
    const balancesResult = await Promise.all(
      blockchains.map(async (chain) => {
        try {
          const addressData = scannedAddresses[chain.type];
          if (!addressData) return chain.tokens.map(() => 0);
          const targetAddress = addressData.address || addressData.accountId;
          if (!targetAddress) return chain.tokens.map(() => 0);
          const Adapter = adapterMap[chain.type];
          if (!Adapter) return chain.tokens.map(() => 0);
          const adapter = new Adapter(chain);
          const result = await adapter.getBalances(targetAddress);
          console.log(`${chain.network} Synced for Payer`);
          return result.map((x) => Number(x) || 0);
        } catch (err) {
          console.error(`Error fetching balances for ${chain.type}:`, err);
          return chain.tokens.map(() => 0);
        }
      }),
    );
    const activeTokensResult = balancesResult.map((chainBalances, chainIndex) =>
      chainBalances.map((bal, tokenIndex) => {
        const tokenUSDPrice = usdConversionRates[chainIndex]?.[tokenIndex] ?? 0;
        if (tokenUSDPrice === 0) return false;
        return bal >= requiredUSD / tokenUSDPrice;
      }),
    );
    updateState({ balances: balancesResult, activeTokens: activeTokensResult });
  };

  const fetchFaceID = async (image) => {
    try {
      const response = await fetch(`/api/fetchFaceID`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
        redirect: "follow",
      });
      return await response.json();
    } catch {
      return null;
    }
  };

  const handleBackPress = () => {
    if (state.stage > 0 && state.stage < 3) {
      updateState({ stage: state.stage - 1, loading: false });
    } else {
      const navState = navigation.getState();
      const previousRouteName = navState?.routes[navState.index - 1]?.name;
      if (previousRouteName === "(screens)/main") router.back();
      else router.navigate("/(screens)/main");
    }
  };

  const keyboardCellStyle = {
    width: normalize(100),
    height: normalize(50),
    borderWidth: 1,
    borderColor: rgbaToHex(255, 255, 255, 20),
    borderRadius: 5,
    margin: 3,
  };

  const isAmountValid = parseFloat(deleteLeadingZeros(formatInputText(state.amount))) > 0;

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor }]}>
      <Header />
      <View style={GlobalStyles.topBar}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={GlobalStyles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color={whiteColor} />
        </TouchableOpacity>
        <Text style={GlobalStyles.headerTitle}>Charge</Text>
        <View style={{ width: "20%" }} />
      </View>


      <ScrollView
        showsVerticalScrollIndicator={false}
        style={GlobalStyles.scrollContainer}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: normalize(20),
          paddingBottom: normalize(20),
        }}
      >
        {/* STAGE 0: AMOUNT INPUT */}
        {state.stage === 0 && (
          <View
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={GlobalStyles.title}>Enter Amount (USD)</Text>
            <Text style={[GlobalStyles.amountText, { color: whiteColor }]}>
              ${deleteLeadingZeros(formatInputText(state.amount))}
            </Text>
            <View style={{ width: "100%", paddingHorizontal: normalize(20) }}>
              <VirtualKeypad
                onPress={handleAmountDigit}
                onBackspace={handleAmountBackspace}
                showDot={true}
                color={whiteColor}
              />
            </View>
            <View style={GlobalStyles.buttonGroup}>
              <Pressable
                disabled={!isAmountValid}
                style={[
                  GlobalStyles.buttonStyle,
                  GlobalStyles.captureButton,
                  GlobalStyles.w100,
                  {
                    backgroundColor: state.loading ? tertiaryColor + "77" : tertiaryColor,
                    borderColor: state.loading ? tertiaryColor + "77" : tertiaryColor,
                  },
                  !isAmountValid && { opacity: 0.3 }
                ]}
                onPress={() => updateState({ stage: 1, kindPayment: 1 })}
              >
                <Text style={GlobalStyles.buttonText}>Pay with FaceID</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* STAGE 1: CAMERA */}
        {state.stage === 1 && (
          <View
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* TOP GROUP */}
            <View style={{ alignItems: "center", width: "100%" }}>
              <View style={[GlobalStyles.screenHeaderContainer, { marginTop: 0, paddingTop: 0 }]}>
                <Text style={[GlobalStyles.title, { textAlign: "center" }]}>Face Verification</Text>
                <Text style={[GlobalStyles.subtitle, { textAlign: "center", marginHorizontal: normalize(20) }]}>
                  Center the face in the circle to securely verify identity.
                </Text>
              </View>

              <View
                style={[
                  GlobalStyles.cameraRing,
                  {
                    width: normalize(230),
                    height: normalize(230),
                    borderRadius: normalize(115),
                    borderColor: state.loading ? mainColor + "77" : mainColor,
                    marginTop: normalize(24),
                  },
                ]}
              >
                <View style={[GlobalStyles.cameraInner, { borderRadius: normalize(115) }]}>
                  <CamFace
                    size={normalize(230)}
                    facing={"front"}
                    take={state.take}


                    onImage={async (image) => {
                      try {
                        const faceIdResult = await fetchFaceID(image);
                        if (!faceIdResult || !faceIdResult.result) {
                          throw new Error("Identity not recognized. Please try again.");
                        }
                        const responsePayload = await fetchPayment(1, faceIdResult.result);
                        const user = responsePayload.user || responsePayload.result?.user;
                        const addresses = responsePayload.addresses || responsePayload.result?.addresses;
                        const hasPincode = responsePayload.pincode !== undefined
                          ? responsePayload.pincode
                          : (responsePayload.result?.pincode !== undefined ? responsePayload.result.pincode : true);

                        await updateState({ addresses, user, hasPincode });
                        const updatedRates = await getUSD();
                        await getBalances(addresses, updatedRates);
                        updateState({ loading: false, stage: 2 });
                      } catch (error) {
                        toast.error("Face ID Error", { description: error.message });
                        updateState({ loading: false });
                      }
                    }}

                  />
                </View>
              </View>

              <View style={[GlobalStyles.loadingContainer, { height: normalize(40) }]}>
                {state.loading && (
                  <>
                    <ActivityIndicator color={secondaryColor} size="small" />
                    <Text style={GlobalStyles.loadingText}>Processing...</Text>
                  </>
                )}
              </View>
            </View>

            {/* MIDDLE GROUP (BUTTON & SECURITY) */}
            <View style={{ width: "100%", alignItems: "center" }}>
              <Pressable
                disabled={state.loading}
                style={({ pressed }) => [
                  GlobalStyles.buttonStyle,
                  GlobalStyles.captureButton,
                  {
                    opacity: state.loading || pressed ? 0.7 : 1,
                    width: "100%",
                  },
                ]}
                onPress={() => {
                  updateState({ take: true, loading: true });
                  setTimeout(() => updateState({ take: false }), 100);
                }}
              >
                <Text style={GlobalStyles.buttonText}>
                  {state.loading ? "Processing..." : "Scan Face"}
                </Text>

              </Pressable>

              <Text style={[GlobalStyles.secureNote, { textAlign: 'center', marginHorizontal: normalize(20), marginTop: normalize(8), opacity: 0.7 }]}>
                Biometrics are encrypted and never shared. 18+ only.
              </Text>
            </View>

            {/* BOTTOM GROUP (LEGAL) */}
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#666", fontSize: normalize(9), fontFamily: "monospace" }}>By scanning, you agree to our</Text>
              <View style={{ flexDirection: "row", gap: 5 }}>
                <Pressable onPress={() => navigation.navigate("privacy")}>
                  <Text style={{ color: mainColor, fontSize: normalize(9), fontFamily: "monospace", textDecorationLine: "underline" }}>Terms of Use</Text>
                </Pressable>
                <Text style={{ color: "#666", fontSize: normalize(9), fontFamily: "monospace" }}>&</Text>
                <Pressable onPress={() => navigation.navigate("privacy")}>
                  <Text style={{ color: mainColor, fontSize: normalize(9), fontFamily: "monospace", textDecorationLine: "underline" }}>Privacy Policy</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* STAGE 2: SELECT TOKEN */}
        {state.stage === 2 && (
          <Fragment>
            <Text
              style={[
                GlobalStyles.titlePaymentToken,
                { marginBottom: normalize(60), marginTop: normalize(30) },
              ]}
            >
              Select Payment Token
            </Text>
            <View style={{ width: "100%", gap: 30 }}>
              {blockchains.flatMap((chain, chainIndex) =>
                chain.tokens.map((token, tokenIndex) => {
                  if (!state.activeTokens[chainIndex][tokenIndex]) return null;
                  return (
                    <Pressable
                      key={`${chain.type}-${chainIndex}-${token.symbol}-${tokenIndex}`}
                      disabled={state.loading}
                      style={[
                        GlobalStyles.buttonStyle,
                        GlobalStyles.captureButton,
                        {
                          backgroundColor: token.color,
                          borderColor: token.color,
                          justifyContent: "center",
                          paddingHorizontal: 0,
                          width: "100%",
                          marginBottom: 0, // Controlled by gap: 12
                        },
                        state.loading ? { opacity: 0.5 } : {},
                      ]}
                      onPress={async () => {
                        try {
                          const transactionDisplay = {
                            amount: (
                              state.amount /
                              context.value.usdConversion[chainIndex][
                              tokenIndex
                              ]
                            ).toFixed(6),
                            name: token.symbol,
                            icon: token.icon,
                            networkIconKey: chain.iconKey,
                          };

                          if (state.hasPincode) {
                            updateState({
                              selectedAsset: { chainIndex, tokenIndex },
                              transactionDisplay,
                              stage: 4,
                              pin: "",
                              pinError: false
                            });
                          } else {
                            updateState({
                              transactionDisplay,
                              stage: 3,
                              loading: true,
                              paymentStatus: "processing",
                            });
                            await payFromAnySource(chainIndex, tokenIndex);
                          }
                        } catch (error) {
                          updateState({ loading: false, paymentStatus: "failed" });
                        }
                      }}
                    >
                      <View
                        style={{
                          width: "100%",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View
                          style={{
                            position: "absolute",
                            left: normalize(4),
                            flexDirection: "row",
                            alignItems: "center",
                            height: "100%",
                          }}
                        >
                          {token.icon}
                          <View style={GlobalStyles.networkTokenNetworkIcon}>
                            {getIcon(chain.iconKey, 18)}
                          </View>
                        </View>
                        <Text
                          style={[
                            GlobalStyles.buttonTextSmall,
                            {
                              textAlign: "center",
                              width: "100%",
                              paddingHorizontal: normalize(50),
                              color: getContrastColor(token.color),
                            },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          Pay with {token.symbol}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }),
              )}
            </View>
          </Fragment>
        )}

        {/* STAGE 3: SUCCESS / PROCESSING / ERROR */}
        {state.stage === 3 && (
          <View
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >

            {/* Dynamic Status Icon */}
            <View >
              {state.paymentStatus === "processing" && (
                <Ionicons name="sync-circle" size={normalize(180)} color={secondaryColor} />
              )}
              {state.paymentStatus === "completed" && (
                <Ionicons name="checkmark-circle" size={normalize(180)} color={mainColor} />
              )}
              {state.paymentStatus === "failed" && (
                <Ionicons name="close-circle" size={normalize(180)} color="#FF3B30" />
              )}
            </View>

            {/* Dynamic Status Text */}
            <Text
              style={[
                GlobalStyles.statusText,
                {
                  fontSize: normalize(24),
                  color:
                    state.paymentStatus === "processing" ? secondaryColor :
                      state.paymentStatus === "completed" ? mainColor :
                        "#FF3B30", // Red for error
                },
              ]}
            >
              {state.paymentStatus === "processing" && "Processing Payment..."}
              {state.paymentStatus === "completed" && "Payment Completed"}
              {state.paymentStatus === "failed" && "Payment Failed"}
            </Text>

            {/* Transaction Details (Dimmed if failed) */}
            <View
              style={[
                GlobalStyles.network,
                {
                  width: "100%",
                  marginVertical: 20,
                  paddingVertical: 15,
                  opacity: state.paymentStatus === "failed" ? 0.5 : 1 // Dim on failure
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={[GlobalStyles.networkMarginIcon, { position: "relative", marginRight: normalize(12) }]}>
                    {state.transactionDisplay.icon}
                    <View style={GlobalStyles.networkTokenNetworkIcon}>
                      {getIcon(state.transactionDisplay.networkIconKey, 18)}
                    </View>
                  </View>
                  <View style={{ justifyContent: "center" }}>
                    <Text
                      style={[
                        GlobalStyles.networkTokenName,
                        { fontSize: normalize(16), fontWeight: "600" },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {state.transactionDisplay.name} Transfer
                    </Text>
                    <Text style={[GlobalStyles.networkTokenData, { fontSize: normalize(13), color: "#aaa" }]}>
                      {state.kindPayment === 0 ? "QR Payment" : "FaceID Payment"}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", paddingRight: normalize(14) }}>
                  <Text
                    style={{
                      color: "white",
                      fontSize: normalize(16),
                      fontWeight: "600",
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {deleteLeadingZeros(
                      formatInputText(state.transactionDisplay.amount),
                    )}{" "}
                    {state.transactionDisplay.name}
                  </Text>
                  <Text style={[GlobalStyles.networkTokenData, { fontSize: normalize(13), color: "#aaa", marginTop: 2 }]}>
                    $ {deleteLeadingZeros(formatInputText(state.amount))} USD
                  </Text>
                </View>
              </View>
            </View>

            {/* Dynamic Buttons Based on State */}
            <View style={GlobalStyles.buttonGroup}>
              {/* Show Explorer Button ONLY on Success */}
              {state.paymentStatus === "completed" && (
                <Pressable
                  style={[GlobalStyles.buttonStyle, GlobalStyles.captureButton, { width: "100%" }]}
                  onPress={() => Linking.openURL(state.explorerURL)}
                >
                  <Text style={GlobalStyles.buttonText}>View on Explorer</Text>
                </Pressable>
              )}

              {/* Show Retry Button ONLY on Failure */}
              {state.paymentStatus === "failed" && (
                <Pressable
                  style={[GlobalStyles.buttonStyle, GlobalStyles.captureButton, { width: "100%", backgroundColor: "#FF3B30", borderColor: "#FF3B30" }]}
                  onPress={() => updateState({ stage: 2, paymentStatus: "idle" })}
                >
                  <Ionicons name="refresh-outline" size={normalize(20)} color="white" style={{ marginRight: normalize(8) }} />
                  <Text style={GlobalStyles.buttonText}>Try Again</Text>
                </Pressable>
              )}

              {/* Done/Cancel Button */}
              <Pressable
                disabled={state.paymentStatus === "processing"}
                style={[
                  GlobalStyles.buttonStyle,
                  GlobalStyles.captureButton,
                  {
                    width: "100%",
                    backgroundColor: tertiaryColor,
                    borderColor: tertiaryColor,
                  },
                  state.paymentStatus === "processing" ? { opacity: 0.5, borderColor: "black" } : {},
                ]}
                onPress={() => setState(BaseStatePaymentWallet)}
              >
                <Text style={GlobalStyles.buttonText}>
                  {state.paymentStatus === "failed" ? "Cancel" : "Done"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* STAGE 4: PIN AUTHORIZATION */}
        {state.stage === 4 && (
          <View
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >


            {/* TOP GROUP */}
            <View style={{ alignItems: "center", width: "100%" }}>
              <View style={[GlobalStyles.screenHeaderContainer, { marginTop: 0 }]}>
                <Text style={[GlobalStyles.title, { textAlign: "center" }]}>
                  Authorize Payment
                </Text>
                <Text style={[GlobalStyles.subtitle, { textAlign: "center", marginHorizontal: normalize(20) }]}>
                  Please enter your 4-digit security PIN to authorize this transaction.
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 20, marginTop: normalize(30) }}>
                {[1, 2, 3, 4].map((i) => (
                  <Animated.View
                    key={i}
                    style={[
                      {
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: "#444",
                      },
                      state.pin.length >= i
                        ? { backgroundColor: mainColor, borderColor: mainColor }
                        : { backgroundColor: "transparent" },
                      state.pinError
                        ? { backgroundColor: "#ff4444", borderColor: "#ff4444" }
                        : null,
                      state.loading
                        ? {
                          transform: [{ scale: pulseAnim }],
                          opacity: pulseAnim.interpolate({
                            inputRange: [1, 1.2],
                            outputRange: [1, 0.6],
                          }),
                        }
                        : null,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* MIDDLE GROUP (KEYPAD + BUTTON) */}
            <View style={{ width: "100%", alignItems: "center" }}>

              <View style={{ width: "100%", paddingHorizontal: normalize(20) }}>
                <VirtualKeypad
                  onPress={handlePinDigit}
                  onBackspace={handlePinBackspace}
                  randomize={true}
                />
              </View>

              <Pressable
                disabled={state.pin.length !== 4 || state.loading}
                style={({ pressed }) => [
                  GlobalStyles.buttonStyle,
                  GlobalStyles.captureButton,
                  {
                    backgroundColor: state.pin.length === 4
                      ? (state.loading ? mainColor + "77" : mainColor)
                      : "#222",
                    borderColor: "transparent",
                    opacity:
                      state.pin.length !== 4 || pressed ? 0.7 : 1,
                    width: "100%",
                    marginTop: normalize(20)
                  },
                ]}
                onPress={verifyPinAndPay}
              >
                {state.loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text
                    style={[
                      GlobalStyles.buttonText,
                      { color: state.pin.length === 4 ? "white" : "#666" },
                    ]}
                  >
                    Verify & Pay
                  </Text>
                )}
              </Pressable>

            </View>


          </View>
        )}

      </ScrollView>

    </SafeAreaView>
  );
}