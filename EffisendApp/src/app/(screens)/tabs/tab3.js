import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import GoogleWallet from "../../../assets/images/GW.png";
import {
  createGlobalStyles,
  mainColor,
  whiteColor,
} from "../../../core/styles";
import { formatTimestamp, getEncryptedStorageValue } from "../../../core/utils";
import ContextModule from "../../../providers/contextModule";
import { useSmartSize } from "../../../providers/smartProvider";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function Tab3({ isActive }) {
  const context = React.useContext(ContextModule);
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const scrollView = useRef(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Use standard state for smoother height transitions
  // Animated Height Logic
  const MIN_CONTENT = normalize(44);
  const MAX_CONTENT = normalize(114);
  const animatedHeight = useRef(new Animated.Value(MIN_CONTENT)).current;

  const animateToHeight = (toValue) => {
    Animated.spring(animatedHeight, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  };

  const handleTextChange = (text) => {
    setMessage(text);
  };

  const renderFormattedMessage = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={i} style={{ fontFamily: "Exo2_700Bold" }}>
            {part.substring(2, part.length - 2)}
          </Text>
        );
      }
      return part;
    });
  };

  // --- API and Logic (Kept as per your original) ---
  const sendMessage = useCallback(async () => {
    if (!message.trim()) return;

    // API and Logic moved inside to avoid dependency issues
    async function chatWithAgentInternal(textToSend) {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      const user = await getEncryptedStorageValue("user");
      const mappedHistory = context.value.chatGeneral.map((chat) => ({
        role: chat.type === "user" ? "user" : "assistant",
        content: chat.message,
      }));

      const raw = JSON.stringify({
        message: textToSend,
        context: {
          address: context.value.addresses,
          user: user,
          thread_id: user,
          gmhistory: mappedHistory,
          cards: context.value.cards || [],
        },
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };

      try {
        const response = await fetch("/api/chatWithAgent", requestOptions);
        return await response.json();
      } catch (err) {
        return { result: null, error: "Network Error" };
      }
    }

    function responseModifierInternal(responseResult) {
      let temp = { ...responseResult };
      if (
        temp.used_tools &&
        temp.used_tools.includes("transfer_to_multiple_spei")
      ) {
        temp.message = "All CLABE accounts received the payment successfully.";
      }
      return temp;
    }

    setLoading(true);
    const userMessage = message.trim();
    setMessage("");
    animateToHeight(normalize(44)); // Reset height after sending

    let temp = [...context.value.chatGeneral];
    temp.push({
      message: userMessage,
      type: "user",
      time: Date.now(),
      tools: [],
    });

    context.setValue({ chatGeneral: temp });
    setTimeout(() => scrollView.current?.scrollToEnd({ animated: true }), 100);

    const { result, error } = await chatWithAgentInternal(userMessage);

    let finalMessageText = "Sorry, I couldn't process that.";
    let usedTools = [];

    if (error) {
      finalMessageText = `Error: ${error}`;
    } else if (result) {
      const finalResponse = responseModifierInternal(result);
      finalMessageText = finalResponse.message;
      usedTools = finalResponse.used_tools || [];
    }

    temp.push({
      message: finalMessageText.replace(/^\n+/, ""),
      type: "system",
      time: Date.now(),
      tools: usedTools,
      tool: usedTools.length > 0 ? usedTools[usedTools.length - 1] : "",
    });

    context.setValue({ chatGeneral: temp });
    setLoading(false);
    setTimeout(() => {
      scrollView.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [context, message]);

  useEffect(() => {
    if (isActive) {
      console.log("Tab 3 is active");
      setTimeout(() => {
        scrollView.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isActive]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", width: smartSize.width, alignSelf: "center" }}>
      <ScrollView
        ref={scrollView}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: normalize(16),
          paddingTop: normalize(20),
          paddingBottom: normalize(20),
        }}
      >
        {context.value.chatGeneral.map((item, index, array) => (
          <View
            key={`Message:${index}`}
            style={[
              {
                borderRadius: normalize(16),
                borderBottomRightRadius:
                  item.type === "user" ? normalize(0) : normalize(16),
                borderBottomLeftRadius:
                  item.type === "user" ? normalize(16) : normalize(0),
                paddingHorizontal: normalize(16),
                paddingVertical: normalize(12),
                maxWidth: "85%",
                alignSelf: item.type === "user" ? "flex-end" : "flex-start",
                backgroundColor: item.type === "user" ? "rgba(66, 134, 245, 0.15)" : "#1C1C1E",
              },
              index !== 0 && array[index - 1].type !== item.type
                ? { marginTop: normalize(16) }
                : { marginTop: normalize(8) },
            ]}
          >
            <Text
              style={[
                GlobalStyles.textWhite,
                { fontSize: normalize(15), lineHeight: normalize(22), fontFamily: "Exo2_400Regular" },
              ]}
            >
              {renderFormattedMessage(item.message)}
            </Text>

            {(item.tools?.includes("fund_metamask_card") ||
              item.tool === "fund_metamask_card") && (
                <Pressable
                  style={{ marginTop: normalize(12) }}
                  onPress={() =>
                    Linking.openURL(
                      "intent://com.google.android.apps.walletnfcrel/#Intent;scheme=android-app;package=com.google.android.apps.walletnfcrel;end",
                    )
                  }
                >
                  <Image
                    style={{
                      width: "100%",
                      height: undefined,
                      aspectRatio: 854 / 197,
                      borderRadius: normalize(12),
                    }}
                    source={GoogleWallet}
                  />
                </Pressable>
              )}

            <Text
              style={{
                color: "rgba(255,255,255,0.3)",
                alignSelf: "flex-end",
                fontSize: normalize(10),
                marginTop: normalize(6),
                fontFamily: "Exo2_400Regular",
              }}
            >
              {formatTimestamp(item.time)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          width: "100%",
          paddingHorizontal: normalize(16),
          alignItems: "flex-end",
          gap: normalize(12),
          paddingVertical: normalize(12),
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.05)",
          backgroundColor: "#000",
        }}
      >
        <View style={{ flex: 1, position: "relative" }}>
          {/* HIDDEN MEASURING INPUT */}
          <TextInput
            multiline
            value={message}
            style={{
              position: "absolute",
              opacity: 0,
              width: "100%",
              zIndex: -1,
              paddingHorizontal: normalize(20),
              paddingVertical: normalize(10),
              fontSize: normalize(15),
              minHeight: normalize(44),
            }}
            onContentSizeChange={(e) => {
              const rawH = e.nativeEvent.contentSize.height;
              const clamped = Math.min(Math.max(rawH, normalize(44)), normalize(114));
              animateToHeight(clamped);
            }}
            editable={false}
            pointerEvents="none"
          />

          {/* VISIBLE ANIMATED INPUT */}
          <AnimatedTextInput
            multiline
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            placeholder="Ask me anything..."
            placeholderTextColor="#666"
            value={message}
            onChangeText={handleTextChange}
            style={{
              width: "100%",
              backgroundColor: "#1A212E", // Scented blue-black
              borderRadius: normalize(22),
              paddingHorizontal: normalize(20),
              paddingVertical: normalize(10),
              color: "white",
              fontSize: normalize(15),
              textAlign: "left",
              textAlignVertical: "center",
              height: animatedHeight,
              ...Platform.select({
                web: {
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                },
              }),
            }}
          />
        </View>

        <Pressable
          onPress={sendMessage}
          disabled={!message.trim() || loading}
          style={({ pressed }) => [
            {
              width: normalize(48),
              height: normalize(48),
              backgroundColor: mainColor,
              borderRadius: normalize(24),
              justifyContent: "center",
              alignItems: "center",
              opacity: !message.trim() || loading ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={whiteColor} />
          ) : (
            <Ionicons name="send" size={normalize(20)} color={whiteColor} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
