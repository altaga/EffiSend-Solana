import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import {
  Linking,
  Modal,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { blockchains } from "../core/chains";
import { createGlobalStyles, mainColor } from "../core/styles";
import { useSmartSize } from "../providers/smartProvider";

export default function PassModal({ visible, pass, onClose, address }) {
  const smartSize = useSmartSize();
  const { width, height, normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);

  // STRICT CHAIN IDENTIFICATION
  const chainConfig = useMemo(() => {
    if (!pass) return null;

    // 1. Primary: Check by unique chainId (e.g., 143 for Monad)
    if (pass.chainId) {
      const byId = blockchains.find((c) => c.chainId === pass.chainId);
      if (byId) return byId;
    }

    // 2. Secondary: Check by iconKey (e.g., "mon" or "base")
    if (pass.iconKey) {
      const byIcon = blockchains.find((c) => c.iconKey === pass.iconKey);
      if (byIcon) return byIcon;
    }

    // 3. Fallback: Generic type (last resort)
    return blockchains.find((c) => c.type === pass.chain);
  }, [pass]);

  const themeColor = chainConfig?.color || mainColor;

  // Helper to determine text color based on background luminance
  const contrastColor = useMemo(() => {
    const hex = themeColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#FFFFFF";
  }, [themeColor]);

  if (!pass) return null;

  const assignment = pass.attributes?.find(
    (attr) => attr.trait_type === "Assignment",
  )?.value;

  const handleShare = async () => {
    try {
      const shareMessage = `I just attended ${pass.name}!\n\nCheck it out here: ${pass.external_url || pass.image}`;
      await Share.share({ message: shareMessage, title: "Share your Pass" });
    } catch (error) {
      console.error("Error sharing:", error.message);
    }
  };

  const handleExplorerLink = () => {
    const baseUrl = chainConfig?.blockExplorer || "https://monadscan.com/";
    
    if (pass.chain === "hedera") {
      Linking.openURL(
        `https://hashscan.io/mainnet/token/${pass.contract}/${pass.tokenId}`,
      );
    } else if (pass.chain === "solana") {
      // Use the configured Solana explorer with the token address
      Linking.openURL(`${baseUrl}address/${pass.contract}`);
    } else {
      // EVM fallback using the configured explorer
      Linking.openURL(`${baseUrl}address/${address}#nfttransfers`);
    }
  };

  return (
    <Modal
      visible={visible}
      hardwareAccelerated
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          {
            height: "100%",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <View style={[GlobalStyles.modalOverlay, { height, width }]}>
          <TouchableOpacity
            style={[GlobalStyles.backdrop]}
            activeOpacity={1}
            onPressOut={onClose}
          >
            <View
              style={[
                GlobalStyles.modalContainer,
                {
                  height: "auto",
                  maxHeight: "90%",
                  padding: normalize(20),
                  width: "85%",
                  alignSelf: "center",
                  backgroundColor: "#1C1C1E",
                  borderRadius: normalize(24),
                  borderWidth: 1,
                  borderColor: themeColor + "30", // Translucent network border
                },
              ]}
            >
              <View
                style={[
                  GlobalStyles.modalHeader,
                  { marginBottom: normalize(16) },
                ]}
              >
                <View>
                  <Text
                    style={[
                      GlobalStyles.modalTitle,
                      {
                        opacity: 0.5,
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                        fontSize: normalize(12),
                      },
                    ]}
                  >
                    {/* Correctly displays "Monad" or "Base Mainnet" */}
                    {chainConfig?.network ||
                      (pass.isPoap ? "POAP" : "Pass Details")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: normalize(20),
                    padding: normalize(6),
                  }}
                >
                  <Ionicons name="close" size={normalize(20)} color="white" />
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: "center", width: "100%" }}>
                <View
                  style={{
                    elevation: 15,
                    borderRadius: normalize(20),
                    backgroundColor: "#000",
                    padding: normalize(4),
                    marginBottom: normalize(24),
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  <Image
                    source={{ uri: pass.image }}
                    contentFit="cover"
                    transition={200}
                    style={{
                      width: normalize(140),
                      height: normalize(140),
                      borderRadius: normalize(16),
                      borderWidth: 1,
                      borderColor: themeColor, // Solid network border
                    }}
                  />
                </View>

                <View
                  style={{ alignItems: "center", marginBottom: normalize(24) }}
                >
                  <Text
                    style={[
                      GlobalStyles.title,
                      {
                        fontSize: normalize(20),
                        fontFamily: "Exo2_700Bold",
                        marginBottom: normalize(4),
                      },
                    ]}
                  >
                    {pass.name}
                  </Text>
                  <Text
                    style={{
                      color: "#A0A0A0",
                      textAlign: "center",
                      fontSize: normalize(12),
                      lineHeight: normalize(18),
                      paddingHorizontal: normalize(10),
                    }}
                  >
                    {pass.description}
                  </Text>
                </View>
              </View>

              {assignment && (
                <View
                  style={[
                    GlobalStyles.assignmentBox,
                    {
                      backgroundColor: themeColor + "05", // Very light tint
                      padding: normalize(10),
                      borderRadius: normalize(12),
                      marginBottom: normalize(20),
                      borderWidth: 1,
                      borderColor: themeColor + "20",
                      width: "100%",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: themeColor,
                      fontSize: normalize(10),
                      fontFamily: "Exo2_700Bold",
                      textTransform: "uppercase",
                      textAlign: "center",
                      marginBottom: normalize(4),
                    }}
                  >
                    Assignment
                  </Text>
                  <Text
                    style={{
                      color: "white",
                      fontSize: normalize(14),
                      fontFamily: "Exo2_700Bold",
                      textAlign: "center",
                    }}
                  >
                    {assignment}
                  </Text>
                </View>
              )}

              <View style={{ width: "100%", gap: normalize(12) }}>
                <TouchableOpacity
                  style={[
                    GlobalStyles.buttonStyle,
                    {
                      backgroundColor: "#FFFFFF",
                      borderColor: "#FFFFFF",
                      height: normalize(48),
                      borderRadius: normalize(24),
                    },
                  ]}
                  onPress={handleShare}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="share-social"
                      size={normalize(20)}
                      color="black"
                    />
                    <Text
                      style={[
                        GlobalStyles.buttonTextSmall,
                        { marginLeft: normalize(10), color: "black" },
                      ]}
                    >
                      Share to Socials
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    GlobalStyles.buttonStyle,
                    {
                      backgroundColor: themeColor,
                      borderColor: themeColor,
                      borderWidth: 1,
                      height: normalize(48),
                      borderRadius: normalize(24),
                    },
                  ]}
                  onPress={handleExplorerLink}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <FontAwesome
                      name="external-link"
                      size={normalize(18)}
                      color={contrastColor}
                    />
                    <Text
                      style={[
                        GlobalStyles.buttonTextSmall,
                        { marginLeft: normalize(10), color: contrastColor },
                      ]}
                    >
                      Check on {chainConfig?.network || "Explorer"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
