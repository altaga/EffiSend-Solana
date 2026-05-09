import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useNavigation, useRouter } from "expo-router";
import { useContext, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "react-native-sonner";
import Header from "../../components/header";
import { blockchains, getIcon } from "../../core/chains";
import {
  backgroundColor,
  createGlobalStyles,
  whiteColor,
} from "../../core/styles";
import { getContrastColor } from "../../core/utils";
import ContextModule from "../../providers/contextModule";
import { useSmartSize } from "../../providers/smartProvider";

export default function Receive() {
  const { value } = useContext(ContextModule);
  const smartSize = useSmartSize();
  const GlobalStyles = createGlobalStyles(smartSize);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChain, setSelectedChain] = useState(null);
  const router = useRouter();
  const navigation = useNavigation();

  const getAddressFromContext = (type) => {
    if (!value?.addresses) return "0x000...000";
    return value.addresses[type] || "Address not found";
  };

  const handleOpenQR = (chain) => {
    setSelectedChain({ ...chain, address: getAddressFromContext(chain.type) });
    setModalVisible(true);
  };

  const handleCopy = async (chain) => {
    const address = getAddressFromContext(chain.type);
    toast(`${chain.network} ${chain.type === "hedera" ? "Account Id" : "Address"} Copied`, {
      description: `${chain.type === "hedera" ? address : `${address.slice(0, 6)}...${address.slice(-4)}`}`,
      duration: 2500,
      styles: {
        container: {
          backgroundColor: chain.color,
          borderColor: chain.color,
        },
        title: {
          color: getContrastColor(chain.color),
        },
        description: {
          color: getContrastColor(chain.color),
        },
      },
    });
    await Clipboard.setStringAsync(address);
  };

  const handleBackPress = () => {
    const state = navigation.getState();
    const previousRouteName = state?.routes[state.index - 1]?.name;
    if (previousRouteName === "(screens)/main") router.back();
    else router.navigate("/(screens)/main");
  };

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
        <Text style={GlobalStyles.headerTitle}>Receive Funds</Text>
        <View style={{ width: "20%" }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={GlobalStyles.scrollContainer}
        contentContainerStyle={[
          GlobalStyles.scrollContainerContent,
          GlobalStyles.pb40,
        ]}
      >
        {blockchains.map((chain, index) => {
          const address = getAddressFromContext(chain.type);
          return (
            <View key={index} style={[GlobalStyles.network, { width: "90%" }]}>
              <View
                style={[
                  GlobalStyles.networkMarginIcon,
                  { position: "relative" },
                ]}
              >
                {getIcon(chain.iconKey, 50)}
              </View>
              <View style={GlobalStyles.textWrapper}>
                <Text style={GlobalStyles.networkTokenName}>
                  {chain.network}
                </Text>
                <Text style={GlobalStyles.networkTokenData} numberOfLines={1}>
                  {chain.type === "hedera"
                    ? address
                    : `${address.slice(0, 8)}...${address.slice(-6)}`}
                </Text>
              </View>
              <View style={[GlobalStyles.rowCenter, { marginRight: 20, gap: 20  }]}>
                <TouchableOpacity onPress={() => handleOpenQR(chain)}>
                  <Ionicons
                    name="qr-code-outline"
                    size={24}
                    color={whiteColor}
                    style={GlobalStyles.actionIconSpaced}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCopy(chain)}>
                  <Ionicons
                    name="copy-outline"
                    size={24}
                    color={whiteColor}
                    style={GlobalStyles.actionIconSpaced}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={modalVisible}
        hardwareAccelerated
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={GlobalStyles.fullScreenCentered}>
          <View
              style={[
                GlobalStyles.smartSizeContainer,
                { width: smartSize.width, height: smartSize.height },
              ]}
            >
            <View style={GlobalStyles.modalContainer}>
              <View style={GlobalStyles.modalHeader}>
                <Text style={GlobalStyles.modalTitle}>
                  {selectedChain?.network}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color={whiteColor} />
                </TouchableOpacity>
              </View>

              <View style={GlobalStyles.qrContainer}>
                {selectedChain && (
                  <QRCode
                    value={selectedChain.address}
                    size={200}
                    color="black"
                    backgroundColor="white"
                    logo={getIcon(selectedChain.iconKey, 40, true)}
                    logoSize={40}
                    logoBorderRadius={40}
                    ecl="H"
                  />
                )}
              </View>

              <View
                style={[GlobalStyles.rowCenter, { justifyContent: "center" }]}
              >
                {selectedChain?.type === "hedera" ? (
                  <Text style={GlobalStyles.networkTokenName}>
                    {selectedChain?.address}
                  </Text>
                ) : selectedChain?.type === "starknet" ? (
                  <View style={GlobalStyles.centerAll}>
                    <Text style={GlobalStyles.networkTokenName}>
                      {selectedChain?.address.slice(
                        0,
                        Math.floor(selectedChain?.address.length / 3),
                      )}
                    </Text>
                    <Text style={GlobalStyles.networkTokenName}>
                      {selectedChain?.address.slice(
                        Math.floor(selectedChain?.address.length / 3),
                        Math.floor(selectedChain?.address.length / 3) * 2,
                      )}
                    </Text>
                    <Text style={GlobalStyles.networkTokenName}>
                      {selectedChain?.address.slice(
                        Math.floor(selectedChain?.address.length / 3) * 2,
                      )}
                    </Text>
                  </View>
                ) : (
                  <View style={GlobalStyles.centerAll}>
                    <Text style={GlobalStyles.networkTokenName}>
                      {selectedChain?.address.slice(
                        0,
                        Math.floor(selectedChain?.address.length / 2),
                      )}
                    </Text>
                    <Text style={GlobalStyles.networkTokenName}>
                      {selectedChain?.address.slice(
                        Math.floor(selectedChain?.address.length / 2),
                      )}
                    </Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => handleCopy(selectedChain)}>
                  <Ionicons
                    name="copy-outline"
                    size={18}
                    color={whiteColor}
                    style={GlobalStyles.actionIconSpaced}
                  />
                </TouchableOpacity>
              </View>

              <Text
                style={[GlobalStyles.networkTokenData, { color: "#aaaaaa" }]}
                numberOfLines={1}
              >
                {`Receive tokens on the ${selectedChain?.network} network only.`}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
