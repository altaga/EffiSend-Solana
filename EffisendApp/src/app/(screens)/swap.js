import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "react-native-sonner";

import { EVMChain } from "../../classes/evmChain";
import { HederaChain } from "../../classes/hederaChain";
import { SolanaChain } from "../../classes/solanaChain";
import { StarknetChain } from "../../classes/starknetChain";
import Header from "../../components/header";
import { blockchains, getIcon } from "../../core/chains";
import {
  backgroundColor,
  createGlobalStyles,
  mainColor,
  whiteColor
} from "../../core/styles";
import {
  epsilonRound,
  getContrastColor,
  getEncryptedStorageValue,
  setAsyncStorageValue
} from "../../core/utils";
import ContextModule from "../../providers/contextModule";
import { useSmartSize } from "../../providers/smartProvider";

// --- Sub-components moved outside to prevent re-mounting on state changes (fixes focus loss) ---

const adapterMap = {
  evm: EVMChain,
  starknet: StarknetChain,
  hedera: HederaChain,
  solana: SolanaChain,
};

const CardSection = ({
  label,
  token,
  amountValue,
  onTokenPress,
  isAmount = false,
  onChangeText,
  balanceValue,
  onBalancePress,
  whiteColor,
  normalize,
  GlobalStyles,
  getIcon,
  balance,
  epsilonRound
}) => (
  <View style={{
    backgroundColor: "#1C1C1E",
    padding: normalize(16),
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    width: "100%",
  }}>
    <Text style={[GlobalStyles.tab4BalanceLabel, { marginBottom: 8 }]}>
      {label}
    </Text>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <View style={{ flex: 1 }}>
        {isAmount ? (
          <Text style={{
            color: whiteColor,
            fontSize: normalize(32),
            fontFamily: "Exo2_700Bold",
            marginVertical: 4,
            marginRight: 10,
          }}>
            {amountValue}
          </Text>
        ) : (
          <TextInput
            style={{
              color: whiteColor,
              fontSize: normalize(32),
              fontFamily: "Exo2_700Bold",
              marginVertical: 4,
              padding: 0,
              marginRight: 10,
            }}
            value={amountValue}
            onChangeText={onChangeText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#444"
          />
        )}
        {balanceValue !== undefined && (
          <TouchableOpacity onPress={onBalancePress}>
            <Text style={{ color: "#666", fontSize: normalize(12) }}>
              Balance: {epsilonRound(balanceValue, 6)} {token.symbol}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        onPress={onTokenPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#1A1A1A",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 9999, // Pill shape
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.2)"
        }}
      >
        <View style={{ marginRight: 8 }}>
          {getIcon(token.symbol, 24)}
        </View>
        <Text style={{ color: whiteColor, fontWeight: "bold", marginRight: 4 }}>{token.symbol}</Text>
        <Ionicons name="chevron-down" size={16} color={whiteColor} />
      </TouchableOpacity>
    </View>
  </View>
);

const TokenRow = ({ token, isSelected, onPress, normalize, GlobalStyles, getIcon, mainColor, whiteColor }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      GlobalStyles.pickerItem,
      isSelected && { backgroundColor: "rgba(255, 255, 255, 0.05)" }
    ]}
  >
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ marginRight: normalize(12) }}>
        {getIcon(token.symbol, 32)}
      </View>
      <View>
        <Text style={{ color: whiteColor, fontSize: normalize(16), fontWeight: "bold" }}>{token.name}</Text>
        <Text style={{ color: "#888", fontSize: normalize(12) }}>{token.symbol}</Text>
      </View>
    </View>
    {isSelected && (
      <Ionicons name="checkmark-circle" size={24} color={mainColor} />
    )}
  </TouchableOpacity>
);

const ChainRow = ({ chain, isSelected, onPress, normalize, GlobalStyles, getIcon, mainColor, whiteColor }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      GlobalStyles.pickerItem,
      isSelected && { backgroundColor: "rgba(255, 255, 255, 0.05)" }
    ]}
  >
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ marginRight: normalize(12) }}>
        {getIcon(chain.iconKey, 32)}
      </View>
      <Text style={{ color: whiteColor, fontSize: normalize(16), fontWeight: "bold" }}>{chain.network}</Text>
    </View>
    {isSelected && (
      <Ionicons name="checkmark-circle" size={24} color={mainColor} />
    )}
  </TouchableOpacity>
);

export default function Swap() {
  const context = useContext(ContextModule);
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const router = useRouter();
  const navigation = useNavigation();

  // --- State ---
  const [loading, setLoading] = useState(false);
  const [chainIndex, setChainIndex] = useState(0);
  const [fromTokenIndex, setFromTokenIndex] = useState(0);
  const [toTokenIndex, setToTokenIndex] = useState(1);
  const [amount, setAmount] = useState("0");

  // Modals state
  const [showChainModal, setShowChainModal] = useState(false);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);

  const selectedChain = blockchains[chainIndex];
  const fromToken = selectedChain.tokens[fromTokenIndex];
  const toToken = selectedChain.tokens[toTokenIndex];
  const balance = context.value.balances[chainIndex]?.[fromTokenIndex] ?? 0;

  const fromPrice = context.value.usdConversion[chainIndex]?.[fromTokenIndex] ?? 0;
  const toPrice = context.value.usdConversion[chainIndex]?.[toTokenIndex] ?? 0;
  const amountNum = parseFloat(amount);
  const estimatedOutput = toPrice > 0 ? (amountNum * fromPrice) / toPrice : 0;
  const exchangeRate = toPrice > 0 ? fromPrice / toPrice : 0;

  const { addresses } = context.value;

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
          return result.map((x) => Number(x) || 0);
        } catch {
          return chain.tokens.map(() => 0);
        }
      }),
    );
    context.setValue({ balances: balancesResult });
    await setAsyncStorageValue({ balances: balancesResult });
  }, [addresses, context]);

  useEffect(() => {
    // Ensure tokens are valid when chain changes
    if (fromTokenIndex >= selectedChain.tokens.length) setFromTokenIndex(0);
    if (toTokenIndex >= selectedChain.tokens.length) setToTokenIndex(1);
    // If they are the same, try to pick different ones
    if (fromTokenIndex === toTokenIndex) {
      if (selectedChain.tokens.length > 1) {
        setToTokenIndex((fromTokenIndex + 1) % selectedChain.tokens.length);
      }
    }
  }, [chainIndex]);

  const updateFromToken = (index) => {
    if (index === toTokenIndex) {
      // If user selects the token already in 'Buy', swap them
      const prevFrom = fromTokenIndex;
      setFromTokenIndex(index);
      setToTokenIndex(prevFrom);
    } else {
      setFromTokenIndex(index);
    }
    setShowFromModal(false);
  };

  const updateToToken = (index) => {
    if (index === fromTokenIndex) {
      // If user selects the token already in 'Sell', swap them
      const prevTo = toTokenIndex;
      setToTokenIndex(index);
      setFromTokenIndex(prevTo);
    } else {
      setToTokenIndex(index);
    }
    setShowToModal(false);
  };

  const handleBackPress = () => {
    const state = navigation.getState();
    const previousRouteName = state?.routes[state.index - 1]?.name;
    if (previousRouteName === "(screens)/main") router.back();
    else router.navigate("/(screens)/main");
  };

  const executeSwap = async () => {
    if (loading) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast("Invalid Amount", {
        description: "Please enter a valid amount to swap.",
        styles: {
          container: { backgroundColor: selectedChain.color, borderColor: selectedChain.color },
          title: { color: getContrastColor(selectedChain.color) },
          description: { color: getContrastColor(selectedChain.color) },
        },
      });
      return;
    }
    if (amountNum > balance) {
      toast("Insufficient Balance", {
        description: `You don't have enough ${fromToken.symbol}.`,
        styles: {
          container: { backgroundColor: selectedChain.color, borderColor: selectedChain.color },
          title: { color: getContrastColor(selectedChain.color) },
          description: { color: getContrastColor(selectedChain.color) },
        },
      });
      return;
    }

    setLoading(true);
    try {
      const user = await getEncryptedStorageValue("user");
      const body = {
        user,
        chainType: selectedChain.type,
        chainId: selectedChain.type === "evm" ? selectedChain.chainId : null,
        fromToken: fromToken.address || fromToken.accountId || fromToken.symbol,
        toToken: toToken.address || toToken.accountId || toToken.symbol,
        amount: amountNum,
        to: context.value.addresses[selectedChain.type],
      };

      const response = await fetch("/api/executeSwap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data && data.result && data.result.hash) {
        const explorerUrl = selectedChain.type === "hedera"
          ? `${selectedChain.blockExplorer}transaction/${data.result.hash}`
          : `${selectedChain.blockExplorer}tx/${data.result.hash}`;

        toast("Swap Successful", {
          description: (
            <Text
              style={{
                color: getContrastColor(selectedChain.color),
                textDecorationLine: 'underline',
                fontWeight: 'bold'
              }}
              onPress={() => Linking.openURL(explorerUrl)}
            >
              View on Explorer
            </Text>
          ),
          styles: {
            container: { backgroundColor: selectedChain.color, borderColor: selectedChain.color },
            title: { color: getContrastColor(selectedChain.color) },
          },
        });
        setAmount("0");
        setTimeout(() => getBalances(), 2000);
        // Optionally navigate back or refresh balances
      } else {
        throw new Error(data?.error || "Swap failed");
      }
    } catch (error) {
      console.error("Swap Error:", error);
      toast("Swap Failed", {
        description: error.message || "An error occurred during the swap.",
        styles: {
          container: { backgroundColor: "#ff4444", borderColor: "#ff4444" },
          title: { color: "#fff" },
          description: { color: "#fff" },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const switchTokens = () => {
    const temp = fromTokenIndex;
    setFromTokenIndex(toTokenIndex);
    setToTokenIndex(temp);
  };


  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor }]}>
      <Header />
      <View style={GlobalStyles.topBar}>
        <TouchableOpacity onPress={handleBackPress} style={GlobalStyles.backButton}>
          <Ionicons name="arrow-back" size={28} color={whiteColor} />
        </TouchableOpacity>
        <Text style={[GlobalStyles.headerTitle, { fontFamily: "Exo2_700Bold", letterSpacing: -1 }]}>Swap</Text>
        <TouchableOpacity onPress={() => setShowChainModal(true)} style={GlobalStyles.backButton}>
          <View style={{
            backgroundColor: "#1A1A1A",
            padding: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.1)"
          }}>
            {getIcon(selectedChain.iconKey, 20)}
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ paddingHorizontal: "5%", paddingTop: 10, paddingBottom: 20 }}
        >
          <View>
            <CardSection
              label="Sell"
              token={fromToken}
              amountValue={amount}
              onChangeText={(val) => {
                // Allow only numbers and one decimal point
                let cleanVal = val.replace(/[^0-9.,]/g, "");
                cleanVal = cleanVal.replace(",", ".");

                // Ensure only one dot exists
                const parts = cleanVal.split(".");
                if (parts.length > 2) {
                  cleanVal = parts[0] + "." + parts.slice(1).join("");
                }

                if (cleanVal === "") {
                  setAmount("0");
                } else {
                  // Remove leading zeros if not followed by a dot
                  if (cleanVal.length > 1 && cleanVal.startsWith("0") && cleanVal[1] !== ".") {
                    cleanVal = cleanVal.replace(/^0+/, "");
                    if (cleanVal === "") cleanVal = "0";
                  }
                  setAmount(cleanVal);
                }
              }}
              onTokenPress={() => setShowFromModal(true)}
              balanceValue={balance}
              onBalancePress={() => setAmount(balance.toString())}
              whiteColor={whiteColor}
              normalize={normalize}
              GlobalStyles={GlobalStyles}
              getIcon={getIcon}
              epsilonRound={epsilonRound}
            />

            <View style={{
              alignItems: "center",
              marginVertical: -14,
              zIndex: 10,
              height: 40,
              justifyContent: "center"
            }}>
              <TouchableOpacity
                onPress={switchTokens}
                style={{
                  backgroundColor: "#1C1C1E",
                  padding: 8,
                  borderRadius: 9999,
                  borderWidth: 4,
                  borderColor: backgroundColor,
                  elevation: 5,
                }}
              >
                <Ionicons name="swap-vertical" size={20} color={"white"} />
              </TouchableOpacity>
            </View>

            <CardSection
              label="Buy"
              token={toToken}
              amountValue={amount === "0" ? "0" : epsilonRound(estimatedOutput, 6).toString()}
              onTokenPress={() => setShowToModal(true)}
              isAmount={true}
              whiteColor={whiteColor}
              normalize={normalize}
              GlobalStyles={GlobalStyles}
              getIcon={getIcon}
              epsilonRound={epsilonRound}
            />
          </View>

          <View style={{ width: "100%", marginTop: 24, alignItems: "center" }}>
            <Text style={{ color: "#444", fontSize: normalize(12), fontFamily: "Exo2_400Regular" }}>
              1 {fromToken.symbol} ≈ {epsilonRound(exchangeRate, 6)} {toToken.symbol}
            </Text>
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: "5%", paddingBottom: 20, width: "100%" }}>
          <Pressable
            disabled={loading}
            onPress={executeSwap}
            style={({ pressed }) => [
              GlobalStyles.buttonStyle,
              {
                height: normalize(60),
                backgroundColor: loading ? selectedChain.color + "77" : selectedChain.color,
                borderColor: "transparent",
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={getContrastColor(selectedChain.color)} />
            ) : (
              <Text style={[GlobalStyles.buttonText, { color: getContrastColor(selectedChain.color) }]}>
                Swap Now
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* --- Selection Modals --- */}

      <Modal visible={showChainModal} transparent animationType="fade">
        <View style={GlobalStyles.fullScreenCentered}>
          <View style={[GlobalStyles.smartSizeContainer, { width: smartSize.width, height: smartSize.height }]}>
            <View style={[GlobalStyles.modalContent, { height: "60%", alignSelf: "center" }]}>
              <View style={GlobalStyles.modalHeader}>
                <Text style={GlobalStyles.modalTitle}>Select Network</Text>
                <TouchableOpacity onPress={() => setShowChainModal(false)}>
                  <Ionicons name="close" size={24} color={whiteColor} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {blockchains.map((chain, index) => (
                  <ChainRow
                    key={index}
                    chain={chain}
                    isSelected={chainIndex === index}
                    onPress={() => { setChainIndex(index); setShowChainModal(false); }}
                    normalize={normalize}
                    GlobalStyles={GlobalStyles}
                    getIcon={getIcon}
                    mainColor={mainColor}
                    whiteColor={whiteColor}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showFromModal} transparent animationType="fade">
        <View style={GlobalStyles.fullScreenCentered}>
          <View style={[GlobalStyles.smartSizeContainer, { width: smartSize.width, height: smartSize.height }]}>
            <View style={[GlobalStyles.modalContent, { height: "70%", alignSelf: "center" }]}>
              <View style={GlobalStyles.modalHeader}>
                <Text style={GlobalStyles.modalTitle}>Sell Token</Text>
                <TouchableOpacity onPress={() => setShowFromModal(false)}>
                  <Ionicons name="close" size={24} color={whiteColor} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedChain.tokens.map((token, index) => (
                  <TokenRow
                    key={index}
                    token={token}
                    isSelected={fromTokenIndex === index}
                    onPress={() => updateFromToken(index)}
                    normalize={normalize}
                    GlobalStyles={GlobalStyles}
                    getIcon={getIcon}
                    mainColor={mainColor}
                    whiteColor={whiteColor}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showToModal} transparent animationType="fade">
        <View style={GlobalStyles.fullScreenCentered}>
          <View style={[GlobalStyles.smartSizeContainer, { width: smartSize.width, height: smartSize.height }]}>
            <View style={[GlobalStyles.modalContent, { height: "70%", alignSelf: "center" }]}>
              <View style={GlobalStyles.modalHeader}>
                <Text style={GlobalStyles.modalTitle}>Buy Token</Text>
                <TouchableOpacity onPress={() => setShowToModal(false)}>
                  <Ionicons name="close" size={24} color={whiteColor} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedChain.tokens.map((token, index) => (
                  <TokenRow
                    key={index}
                    token={token}
                    isSelected={toTokenIndex === index}
                    onPress={() => updateToToken(index)}
                    normalize={normalize}
                    GlobalStyles={GlobalStyles}
                    getIcon={getIcon}
                    mainColor={mainColor}
                    whiteColor={whiteColor}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
