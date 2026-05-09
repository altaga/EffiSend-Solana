import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useNavigation } from "expo-router";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createGlobalStyles,
  mainColor,
  quaternaryColor,
  whiteColor,
} from "../../core/styles";
import ContextModule from "../../providers/contextModule";
import { useSmartSize } from "../../providers/smartProvider";

// Pointing to your Expo API middleware route
const API_URL = "/api/claimNFT";

export default function ClaimScreen() {
  const { value } = useContext(ContextModule);
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const navigation = useNavigation();

  // States: 'idle', 'loading', 'success', 'info', 'error'
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [txUrl, setTxUrl] = useState(null);
  const [isAlreadyOwned, setIsAlreadyOwned] = useState(false);

  const hederaAddress = value.addresses?.hedera;

  const handleAction = async () => {
    // If no address is found, or we are in a done state, act as a back button
    if (!hederaAddress || status === "success" || status === "info") {
      navigation.navigate("(screens)/main");
      return;
    }

    setStatus("loading");
    setMessage("");
    setTxUrl(null);
    setIsAlreadyOwned(false);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId: hederaAddress }),
      });

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();

        if (response.status === 200) {
          setStatus("success");
          setMessage(`NFT Claimed!`);

          // Construct the direct HashScan link to the specific serial number claimed
          if (data.result?.tokenId && data.result?.serialNumber) {
            setTxUrl(
              `https://hashscan.io/mainnet/token/${data.result.tokenId}/${data.result.serialNumber}`,
            );
          }
        } else if (
          response.status === 400 &&
          data.error === "CLOUD_WALLET_EMPTY"
        ) {
          setStatus("info");
          setMessage("Sold Out! All NFTs from this drop have been claimed.");
        } else if (
          response.status === 400 &&
          data.error === "USER_ALREADY_OWNS_NFT"
        ) {
          setStatus("info");
          setIsAlreadyOwned(true);
          setMessage("You already own this NFT.");

          // Construct the direct HashScan link to the specific serial number they ALREADY own
          if (data.result?.tokenId && data.result?.serialNumber) {
            setTxUrl(
              `https://hashscan.io/mainnet/token/${data.result.tokenId}/${data.result.serialNumber}`,
            );
          }
        } else {
          setStatus("error");
          setMessage(data.error || "An unexpected error occurred.");
        }
      } else {
        // AWS returned a plain text error (crash)
        const textError = await response.text();
        setStatus("error");
        setMessage(`Server Error: ${textError.slice(0, 50)}...`);
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Failed to connect to the server.");
    }
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: "#000" }]}>
      <View
        style={[
          GlobalStyles.flex1,
          GlobalStyles.centerAll,
          { width: "100%", paddingHorizontal: normalize(30) },
        ]}
      >
        <View
          style={[
            GlobalStyles.centerAll,
            {
              width: normalize(120),
              height: normalize(120),
              borderRadius: normalize(60),
              backgroundColor: "#1c1c1e",
              marginBottom: normalize(32),
            },
          ]}
        >
          <FontAwesome5
            name="gift"
            size={normalize(50)}
            color={
              status === "success" || isAlreadyOwned
                ? quaternaryColor
                : status === "error"
                  ? "#FF3B30"
                  : mainColor
            }
          />
        </View>

        <Text
          style={[
            GlobalStyles.title,
            { fontSize: normalize(28), marginBottom: normalize(16) },
          ]}
        >
          {status === "idle"
            ? "Exclusive Drop"
            : status === "loading"
              ? "Claiming..."
              : status === "success"
                ? "Congratulations!"
                : status === "info"
                  ? "NFT Status"
                  : "Claim Failed"}
        </Text>

        <Text
          style={[
            GlobalStyles.subtitle,
            { fontSize: normalize(16), color: "#8a8a8e", marginBottom: normalize(40) },
          ]}
        >
          {status === "idle"
            ? "You're eligible for a limited edition Tokyo Dome City NFT. Claim yours now!"
            : message}
        </Text>

        <Pressable
          disabled={status === "loading"}
          style={({ pressed }) => [
            GlobalStyles.buttonStyle,
            {
              backgroundColor:
                status === "success" || status === "info"
                  ? quaternaryColor
                  : mainColor,
              borderColor: "transparent",
              opacity: status === "loading" ? 0.5 : pressed ? 0.8 : 1,
              height: normalize(60),
            },
          ]}
          onPress={handleAction}
        >
          {status === "loading" ? (
            <ActivityIndicator color={whiteColor} />
          ) : (
            <Text
              style={[
                GlobalStyles.buttonText,
                { fontSize: normalize(18), fontWeight: "bold" },
              ]}
            >
              {!hederaAddress || status === "success" || status === "info"
                ? "Back to Home"
                : "Claim NFT Now"}
            </Text>
          )}
        </Pressable>

        {txUrl && (
          <Pressable
            style={{ marginTop: normalize(24) }}
            onPress={() => Linking.openURL(txUrl)}
          >
            <Text
              style={{
                color: mainColor,
                fontSize: normalize(14),
                textDecorationLine: "underline",
              }}
            >
              View on HashScan
            </Text>
          </Pressable>
        )}
      </View>

      <View style={[GlobalStyles.footer, { paddingHorizontal: normalize(20), paddingBottom: normalize(20) }]}>
        <Text style={[GlobalStyles.privacyText, { fontSize: normalize(12), color: "#555" }]}>
          NFTs are minted on the Hedera network.
        </Text>
      </View>
    </SafeAreaView>
  );
}
