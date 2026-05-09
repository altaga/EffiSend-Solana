import { Ionicons } from "@expo/vector-icons";
import { isAddress as isSolanaAddress } from "@solana/kit";
import { getAddress as getEVMAddress } from "ethers";
import { useNavigation, useRouter } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { SafeAreaView } from "react-native-safe-area-context";
import { validateAndParseAddress as validateStarknetAddress } from "starknet";
import CamQR from "../../components/camQR";
import Header from "../../components/header";
import { getIcon } from "../../core/chains";
import { COMPATIBLE_STABLECOINS } from "../../core/constants";
import {
  backgroundColor,
  createGlobalStyles,
  mainColor,
  whiteColor
} from "../../core/styles";
import { isValidSolanaAddress, setEncryptedStorageValue } from "../../core/utils";
import ContextModule from "../../providers/contextModule";
import { useSmartSize } from "../../providers/smartProvider";

const NETWORK_ICONS = {
  "Linea": "linea",
  "Base": "base",
  "Solana": "sol",
  "Monad": "mon",
  "Starknet": "strk",
  "Arbitrum": "arb",
  "Optimism": "op",
  "Ethereum": "eth",
  "Scroll": "scroll",
  "Polygon": "pol",
  "Worldchain": "worldchain",
  "BNB": "bnb",
  "Hyper EVM": "hevm",
  "AVAX": "avax",
  "Sonic": "sonic"
};

export default function Cards() {
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const router = useRouter();
  const navigation = useNavigation();

  const context = useContext(ContextModule);
  const [cards, setCards] = useState(context.value.cards || []);
  const swipeableRefs = useRef(new Map());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("");
  const [token, setToken] = useState("");
  const [alias, setAlias] = useState("");

  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  useEffect(() => {
    setCards(context.value.cards || []);
  }, [context.value.cards]);

  const handleBackPress = () => {
    const state = navigation.getState();
    const previousRouteName = state?.routes[state.index - 1]?.name;
    if (previousRouteName === "(screens)/main") router.back();
    else router.navigate("/(screens)/main");
  };

  const networks = [
    ...new Set([
      ...COMPATIBLE_STABLECOINS.USDC,
      ...COMPATIBLE_STABLECOINS.USDT,
    ]),
  ].sort();

  const availableTokens = Object.keys(COMPATIBLE_STABLECOINS).filter((t) =>
    COMPATIBLE_STABLECOINS[t].includes(network),
  );

  const getRepairedAddress = (addr, net) => {
    if (!addr) return null;
    try {
      if (net === "Starknet") {
        return validateStarknetAddress(addr);
      }
      if (net === "Solana") {
        return isSolanaAddress(addr) ? addr : null;
      }
      // Default to EVM
      return getEVMAddress(addr);
    } catch (e) {
      return null;
    }
  };

  const isFormValid =
    network !== "" &&
    token !== "" &&
    alias.trim() !== "" &&
    getRepairedAddress(address, network) !== null;

  const handleAddCard = async () => {
    const finalAddress = getRepairedAddress(address, network);
    if (isFormValid && finalAddress) {
      let updatedCards;
      if (editingCardId) {
        updatedCards = cards.map(c => c.id === editingCardId ? {
          ...c,
          network,
          token,
          address: finalAddress,
          alias: alias.trim()
        } : c);
      } else {
        const newCard = {
          id: Date.now().toString(),
          network,
          token,
          address: finalAddress,
          alias: alias.trim()
        };
        updatedCards = [...cards, newCard];
      }

      setCards(updatedCards);
      await setEncryptedStorageValue({ cards: updatedCards });
      context.setValue({ cards: updatedCards });

      // Reset form
      setAddress("");
      setNetwork("");
      setToken("");
      setAlias("");
      setEditingCardId(null);
      setModalVisible(false);
    }
  };

  const handleDeleteCard = (id) => {
    if (swipeableRefs.current.has(id)) {
      swipeableRefs.current.get(id).close();
    }

    const performDelete = async () => {
      const updatedCards = cards.filter(c => c.id !== id);
      setCards(updatedCards);
      await setEncryptedStorageValue({ cards: updatedCards });
      context.setValue({ cards: updatedCards });
    };

    if (Platform.OS === "web") {
      if (confirm("Are you sure you want to remove this card?")) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Card",
        "Are you sure you want to remove this card?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: performDelete
          }
        ]
      );
    }
  };

  const handleEditCard = (card) => {
    if (swipeableRefs.current.has(card.id)) {
      swipeableRefs.current.get(card.id).close();
    }
    setEditingCardId(card.id);
    setAlias(card.alias);
    setNetwork(card.network);
    setToken(card.token);
    setAddress(card.address);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor }]}>
      <View style={{ flex: 1, width: smartSize.width, alignSelf: "center" }}>
        <Header />
        <View style={GlobalStyles.topBar}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={GlobalStyles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color={whiteColor} />
          </TouchableOpacity>
          <Text style={GlobalStyles.headerTitle}>Cards</Text>
          <View style={{ width: "20%" }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={[GlobalStyles.scrollContainer, { marginBottom: normalize(100) }]}
          contentContainerStyle={[
            GlobalStyles.scrollContent,
            { justifyContent: "flex-start", gap: normalize(15) },
          ]}
        >
          {cards.length === 0 ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: normalize(100) }}>
              <Ionicons name="card-outline" size={normalize(80)} color="#333" />
              <Text style={{ color: "#666", fontSize: normalize(18), fontFamily: "Exo2_400Regular", marginTop: normalize(20) }}>
                No cards added yet
              </Text>
            </View>
          ) : (
            cards.map((card) => {
              const renderRightActions = () => (
                <View style={{ flexDirection: "row", height: "100%", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => handleEditCard(card)}
                    style={{ backgroundColor: mainColor, justifyContent: "center", alignItems: "center", width: normalize(70), height: "100%", borderRadius: normalize(15), marginLeft: normalize(10) }}
                  >
                    <Ionicons name="pencil" size={normalize(24)} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCard(card.id)}
                    style={{ backgroundColor: "#FF3B30", justifyContent: "center", alignItems: "center", width: normalize(70), height: "100%", borderRadius: normalize(15), marginLeft: normalize(10) }}
                  >
                    <Ionicons name="trash" size={normalize(24)} color="white" />
                  </TouchableOpacity>
                </View>
              );

              return (
                <ReanimatedSwipeable
                  key={card.id}
                  ref={(ref) => {
                    if (ref) {
                      swipeableRefs.current.set(card.id, ref);
                    } else {
                      swipeableRefs.current.delete(card.id);
                    }
                  }}
                  renderRightActions={renderRightActions}
                  containerStyle={{ width: "100%" }}
                >
                  <View style={[GlobalStyles.network, { width: "100%", padding: normalize(15), height: "auto", alignSelf: "center", flexDirection: "row", alignItems: "center" }]}>
                    <View style={{ marginRight: normalize(12) }}>
                      {getIcon(NETWORK_ICONS[card.network] || card.network.toLowerCase(), 40)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[GlobalStyles.networkTokenName, { fontSize: normalize(18), fontWeight: "bold" }]}>{card.alias || `${card.token} Card`}</Text>
                      <Text style={[GlobalStyles.networkTokenData, { color: "#aaa", fontSize: normalize(14) }]}>{card.network} • {card.token}</Text>
                      <Text style={[GlobalStyles.networkTokenData, { marginTop: normalize(8), color: whiteColor }]} numberOfLines={1} ellipsizeMode="middle">
                        {card.address}
                      </Text>
                    </View>
                    <Ionicons name="card-outline" size={normalize(24)} color={"white"} />
                  </View>
                </ReanimatedSwipeable>
              );
            })
          )}
        </ScrollView>



        {/* Floating Add Button */}
        <View style={{ position: "absolute", bottom: 0, width: "100%", alignItems: "center", height: normalize(100) }}>
          <View style={{ width: "100%", alignItems: "center", height: 1, borderTopColor: "rgba(255,255,255,0.2)", borderTopWidth: normalize(1), marginBottom: normalize(10) }}></View>
          <Pressable
            style={[
              GlobalStyles.buttonStyle,
              GlobalStyles.captureButton,
              { width: "90%" }
            ]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={GlobalStyles.buttonText}>Add New Card</Text>
          </Pressable>
        </View>
      </View>

      {/* Add Card Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={GlobalStyles.fullScreenCentered}>
          <View style={[GlobalStyles.smartSizeContainer, { width: smartSize.width, height: smartSize.height }]}>
            <View style={[GlobalStyles.modalContainer, { height: "auto", paddingBottom: normalize(40) }]}>
              <View style={GlobalStyles.modalHeader}>
                <Text style={GlobalStyles.modalTitle}>{editingCardId ? "Edit Card" : "New Card"}</Text>
                <TouchableOpacity onPress={() => {
                  setModalVisible(false);
                  setEditingCardId(null);
                  setAddress("");
                  setNetwork("");
                  setToken("");
                  setAlias("");
                }}>
                  <Ionicons name="close" size={28} color={whiteColor} />
                </TouchableOpacity>
              </View>

              <View style={{ width: "100%", gap: normalize(20) }}>
                {/* Alias Input */}
                <View>
                  <Text style={[GlobalStyles.formTitle, { color: "#aaa", marginBottom: normalize(8), fontSize: normalize(12) }]}>Card Alias</Text>
                  <TextInput
                    style={[GlobalStyles.input, { textAlign: "left", paddingHorizontal: normalize(15), fontSize: normalize(16) }]}
                    placeholder="e.g. Metamask"
                    placeholderTextColor="#aaa"
                    value={alias}
                    onChangeText={setAlias}
                  />
                </View>

                {/* Network Picker */}
                <View>
                  <Text style={[GlobalStyles.formTitle, { color: "#aaa", marginBottom: normalize(8), fontSize: normalize(12) }]}>Network</Text>
                  <Pressable
                    style={[GlobalStyles.input, { justifyContent: "space-between", flexDirection: "row", alignItems: "center", paddingHorizontal: normalize(15) }]}
                    onPress={() => setNetworkModalVisible(true)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {network && (
                        <View style={{ marginRight: normalize(8) }}>
                          {getIcon(NETWORK_ICONS[network] || network.toLowerCase(), 24)}
                        </View>
                      )}
                      <Text style={{ color: network ? "black" : "#aaa", fontFamily: "Exo2_400Regular", fontSize: normalize(16) }}>{network || "Select Network"}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#aaa" />
                  </Pressable>
                </View>

                {/* Token Picker */}
                <View>
                  <Text style={[GlobalStyles.formTitle, { color: "#aaa", marginBottom: normalize(8), fontSize: normalize(12) }]}>Token</Text>
                  <Pressable
                    disabled={!network}
                    style={[GlobalStyles.input, { justifyContent: "space-between", flexDirection: "row", alignItems: "center", paddingHorizontal: normalize(15), opacity: network ? 1 : 0.5 }]}
                    onPress={() => setTokenModalVisible(true)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {token && (
                        <View style={{ marginRight: normalize(8) }}>
                          {getIcon(token.toLowerCase(), 24)}
                        </View>
                      )}
                      <Text style={{ color: token ? "black" : "#aaa", fontFamily: "Exo2_400Regular", fontSize: normalize(16) }}>{token || "Select Token"}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#aaa" />
                  </Pressable>
                </View>

                {/* Address Input */}
                <View>
                  <Text style={[GlobalStyles.formTitle, { color: "#aaa", marginBottom: normalize(8), fontSize: normalize(12) }]}>Address</Text>
                  <View style={[GlobalStyles.input, { flexDirection: "row", alignItems: "center", paddingHorizontal: normalize(15) }]}>
                    <TextInput
                      style={{ flex: 1, color: "black", fontSize: normalize(16), fontFamily: "Exo2_400Regular", height: "100%", textAlign: "left" }}
                      placeholder="0x..."
                      placeholderTextColor="#aaa"
                      value={address}
                      onChangeText={setAddress}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setQrModalVisible(true)}>
                      <Ionicons name="qr-code-outline" size={24} color={mainColor} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Pressable
                  disabled={!isFormValid}
                  style={[
                    GlobalStyles.buttonStyle,
                    GlobalStyles.captureButton,
                    {
                      marginTop: normalize(20),
                      opacity: isFormValid ? 1 : 0.5
                    },
                  ]}
                  onPress={handleAddCard}
                >
                  <Text style={GlobalStyles.buttonText}>{editingCardId ? "Update Card" : "Save Card"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Network Selection Modal */}
      <Modal visible={networkModalVisible} transparent={true} animationType="fade">
        <View style={GlobalStyles.fullScreenCentered}>
          <View style={[GlobalStyles.smartSizeContainer, { width: smartSize.width, height: smartSize.height }]}>
            <View style={[GlobalStyles.pickerBox, { alignSelf: "center" }]}>
              <View style={GlobalStyles.modalHeader}>
                <Text style={GlobalStyles.modalTitle}>Network</Text>
                <TouchableOpacity onPress={() => setNetworkModalVisible(false)}>
                  <Ionicons name="close" size={28} color={whiteColor} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {networks.map((net) => (
                  <TouchableOpacity
                    key={net}
                    style={[GlobalStyles.pickerItem, network === net && GlobalStyles.pickerItemSelected]}
                    onPress={() => {
                      setNetwork(net);
                      setToken("");
                      setNetworkModalVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ marginRight: normalize(12) }}>
                        {getIcon(NETWORK_ICONS[net] || net.toLowerCase(), 32)}
                      </View>
                      <Text style={[GlobalStyles.pickerItemText, network === net && GlobalStyles.pickerItemTextSelected]}>{net}</Text>
                    </View>
                    {network === net && <Ionicons name="checkmark" size={20} color={mainColor} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Token Selection Modal */}
      <Modal visible={tokenModalVisible} transparent={true} animationType="fade">
        <View style={GlobalStyles.fullScreenCentered}>
          <View style={[GlobalStyles.smartSizeContainer, { width: smartSize.width, height: smartSize.height }]}>
            <View style={[GlobalStyles.pickerBox, { alignSelf: "center" }]}>
              <View style={GlobalStyles.modalHeader}>
                <Text style={GlobalStyles.modalTitle}>Token</Text>
                <TouchableOpacity onPress={() => setTokenModalVisible(false)}>
                  <Ionicons name="close" size={28} color={whiteColor} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {availableTokens.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[GlobalStyles.pickerItem, token === t && GlobalStyles.pickerItemSelected]}
                    onPress={() => {
                      setToken(t);
                      setTokenModalVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ marginRight: normalize(12) }}>
                        {getIcon(t.toLowerCase(), 32)}
                      </View>
                      <Text style={[GlobalStyles.pickerItemText, token === t && GlobalStyles.pickerItemTextSelected]}>{t}</Text>
                    </View>
                    {token === t && <Ionicons name="checkmark" size={20} color={mainColor} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={qrModalVisible} transparent={true} animationType="slide">
        <View style={GlobalStyles.fullScreenCentered}>
          <View style={{ width: smartSize.width, height: smartSize.height, backgroundColor: "rgba(0,0,0,0.9)" }}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <View style={[GlobalStyles.topBar, { paddingHorizontal: normalize(20), position: "absolute", top: 0, left: 0, right: 0 }]}>
                <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                  <Ionicons name="close" size={32} color={whiteColor} />
                </TouchableOpacity>
                <Text style={GlobalStyles.headerTitle}>Scan Address</Text>
                <View style={{ width: 32 }} />
              </View>

              <View style={[GlobalStyles.qrRing, { borderColor: mainColor, width: normalize(260), height: normalize(260) }]}>
                <View style={GlobalStyles.qrInner}>
                  <CamQR
                    facing="back"
                    callbackAddress={(scannedAddress) => {
                      setAddress(scannedAddress);
                      setQrModalVisible(false);
                    }}
                  />
                </View>
              </View>

              <View style={{ marginTop: normalize(40), paddingHorizontal: normalize(40) }}>
                <Text style={{ color: "white", fontSize: normalize(18), fontFamily: "Exo2_700Bold", textAlign: "center", marginBottom: normalize(10) }}>
                  Scan QR Code
                </Text>
                <Text style={{ color: "#aaa", fontSize: normalize(14), fontFamily: "Exo2_400Regular", textAlign: "center" }}>
                  Center the EVM, Starknet, or Solana address QR within the frame.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
