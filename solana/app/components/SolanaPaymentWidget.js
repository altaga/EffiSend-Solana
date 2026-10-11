import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { blockchains } from "../core/chains";
import { findPaymentByAmount, findPaymentByReference, parseSolanaUrl } from "../core/solanaPayDetect";
import { mainColor } from "../core/styles";
import { signedApiPost } from "../core/utils";
import { useSmartSize } from "../providers/smartProvider";

const solanaChain = blockchains.find((b) => b.network === "Solana");
const RPC_TIMEOUT_MS = 5000;
// Every 10th poll (~30 s), and whenever every browser RPC failed, the server checks
// too (/api/solanaPayStatus: official RPCs with full history, then Helius). A public
// RPC can answer "nothing yet" from stale or pruned data without failing; this caps
// how long such an answer can hide a payment, at a fraction of the cost of polling
// the server every time.
const SERVER_EVERY = 10;

// DeSmond adds a few base units of "dust" to every Solana Pay amount, so the amount
// alone identifies the payment even when the wallet drops the reference
// (tools/solana.js: at most 999 units at 6 decimals, 99 at 8, 99999 at 9+). The QR
// and the detection keep that exact amount. On screen, the dust digits are dropped
// and the requested amount shows (3.000839 USDC -> 3 USDC).
function displayAmount(amount, decimals) {
  const exact = Number(amount);
  if (!Number.isFinite(exact)) return amount ?? "0.00";
  const dustDigits = decimals >= 9 ? 5 : decimals >= 8 ? 2 : 3;
  const keep = Math.max(0, decimals - dustDigits);
  const shown = Math.floor(exact * 10 ** keep) / 10 ** keep;
  return String(Number(shown.toFixed(keep)));
}

// JSON-RPC over the app's Solana RPCs, read at call time (the registry may have
// replaced the list since this module loaded). First one that answers wins.
async function solanaRpc(method, params) {
  const rpcs = solanaChain?.rpcs?.length ? solanaChain.rpcs : ["https://public.rpc.solanavibestation.com"];
  let lastError;
  for (const url of rpcs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });
      const json = await response.json();
      if (json.error || json.result === undefined) throw new Error(json.error?.message || "no result");
      return json.result;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

// Map SPL token mint addresses → symbol from the chains config
const KNOWN_TOKENS = (solanaChain?.tokens ?? []).reduce((acc, t) => {
  if (t.address) acc[t.address] = t.symbol;
  return acc;
}, {});

export default function SolanaPaymentWidget({ url, reference: referenceProp, createdAt, status: initialStatus = "pending" }) {
  const { normalize } = useSmartSize();

  const [status, setStatus] = useState(initialStatus); // pending | success | error
  const [parsed, setParsed] = useState(null);
  const [transactionSignature, setTransactionSignature] = useState(null);

  // Animation transition state (0 = Show QR, 1 = Show Success)
  const fadeAnim = useRef(new Animated.Value(initialStatus === "success" ? 1 : 0)).current;

  // Parse URL once when the component mounts / url changes
  useEffect(() => {
    const result = parseSolanaUrl(url);
    if (referenceProp) {
      result.reference = referenceProp;
    }
    if (!result.reference) setStatus("error");
    setParsed(result);
  }, [url, referenceProp]);

  // When this payment request was created: amount matches must land after it.
  const [requestedAt] = useState(() => createdAt || Date.now());
  const seenSignaturesRef = useRef(new Set());

  // Polling loop every 3 s: the reference first (exact Solana Pay match), then,
  // every other tick, the exact-amount fallback for wallets that drop the reference.
  useEffect(() => {
    if (!parsed?.reference || status !== "pending") return;

    let intervalId;
    let cancelled = false;
    let tick = 0;
    let busy = false;

    const confirm = (sig) => {
      if (cancelled) return;
      if (sig) setTransactionSignature(sig);
      setStatus("success");
      clearInterval(intervalId);
    };

    const viaServer = async () => {
      const out = await signedApiPost("/api/solanaPayStatus", {
        reference: parsed.reference,
        recipient: parsed.recipient,
        amount: parsed.amount,
        splToken: parsed.splToken,
        createdAt: requestedAt,
      });
      if (out?.signature) confirm(out.signature);
    };

    const checkPayment = async () => {
      if (busy) return;
      busy = true;
      const n = tick++;
      try {
        const byReference = await findPaymentByReference(solanaRpc, parsed.reference);
        if (byReference) return confirm(byReference);
        if (n % 2 === 0) {
          const byAmount = await findPaymentByAmount(solanaRpc, parsed, requestedAt, seenSignaturesRef.current);
          if (byAmount) return confirm(byAmount);
        }
        if (n % SERVER_EVERY === SERVER_EVERY - 1) await viaServer();
      } catch {
        // Every browser RPC failed this tick: ask the server instead.
        await viaServer().catch(() => {}); // still nothing: the loop retries next tick
      } finally {
        busy = false;
      }
    };

    checkPayment(); // Immediate first check
    intervalId = setInterval(checkPayment, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [parsed, status, requestedAt]);

  // Trigger transition animation when status changes to success
  useEffect(() => {
    if (status === "success") {
      Animated.spring(fadeAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }).start();
    }
  }, [status, fadeAnim]);

  const tokenSymbol = parsed?.splToken
    ? (KNOWN_TOKENS[parsed.splToken] ?? "TOKEN")
    : "SOL";

  const isUSDC = tokenSymbol === "USDC";
  const tokenDecimals = parsed?.splToken
    ? (solanaChain?.tokens?.find((t) => t.address === parsed.splToken)?.decimals ?? 6)
    : 9;

  return (
    <View style={[styles.container, { marginTop: normalize(12) }]}>
      <View style={{ width: "100%", backgroundColor: "#333333", height: 1, marginBottom: normalize(20) }} />
      {/* HEADER SECTION */}
      <View style={[styles.headerRow, { marginBottom: normalize(20) }]}>
        <View style={styles.priceContainer}>
          <Text style={[styles.amountText, { fontSize: normalize(20), marginRight: normalize(6) }]}>
            {displayAmount(parsed?.amount, tokenDecimals)}
          </Text>
          <Text style={[styles.tokenText, { fontSize: normalize(14) }]}>
            {isUSDC ? "USDC" : tokenSymbol}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              borderRadius: normalize(6),
              paddingHorizontal: normalize(12),
              paddingVertical: normalize(6),
            },
          ]}
        >
          <Image
            source={require("../assets/images/spay.png")}
            style={{ width: normalize(60), height: normalize(15) }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* CONTENT SECTION (Animated transition between QR Code and Success State) */}
      <View style={{ width: "100%", position: "relative", minHeight: normalize(220) }}>

        {/* QR Code / Pending / Error View */}
        <Animated.View
          pointerEvents={status === "pending" || status === "error" ? "auto" : "none"}
          style={[
            styles.centerContent,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            },
          ]}
        >
          <View style={{ marginBottom: normalize(20) }}>
            <QRCode
              value={url}
              size={normalize(180)}
              color="#FFFFFF"
              backgroundColor="transparent"
              logo={require("../assets/images/solanaPlogo.png")}
              logoSize={normalize(36)}
              logoBackgroundColor="transparent"
            />
          </View>
          <View style={[styles.loadingContainer, { gap: normalize(10) }]}>
            <ActivityIndicator size="small" color={mainColor} />
            <Text
              numberOfLines={1}
              style={[styles.loadingText, { fontSize: normalize(13) }]}
            >
              Awaiting onchain confirmation...
            </Text>
          </View>
        </Animated.View>

        {/* Success State View */}
        <Animated.View
          pointerEvents={status === "success" ? "auto" : "none"}
          style={[
            styles.centerContent,
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={normalize(125)} color="#00FFA3" />
          <Text style={[styles.successTitle, { fontSize: normalize(18), marginTop: normalize(12) }]}>
            Payment Confirmed
          </Text>
          {transactionSignature && (
            <Pressable
              onPress={() => {
                const explorerUrl = `${solanaChain?.blockExplorer ?? "https://solscan.io/"}tx/${transactionSignature}`;
                Linking.openURL(explorerUrl).catch((err) =>
                  console.error("Failed to open explorer link:", err)
                );
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: normalize(6),
                marginTop: normalize(12),
              }}
            >
              <Text style={[styles.explorerButtonText, { fontSize: normalize(14) }]}>
                View on Explorer
              </Text>
              <Ionicons name="open-outline" size={normalize(14)} color="#4286F5" />
            </Pressable>
          )}
        </Animated.View>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  amountText: {
    color: "#FFFFFF",
    fontFamily: "Exo2_700Bold",
  },
  tokenText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontFamily: "Exo2_400Regular",
  },
  badge: {
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#9945FF", // Neon Solana Purple
    fontFamily: "Exo2_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    width: "100%",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "Exo2_400Regular",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "Exo2_400Regular",
  },
  explorerButtonText: {
    color: "#4286F5",
    fontFamily: "Exo2_400Regular",
  },
  successTitle: {
    color: "#FFFFFF",
    fontFamily: "Exo2_700Bold",
    textAlign: "center",
  },
  successSubtext: {
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: "Exo2_400Regular",
    textAlign: "center",
  },
});
