import { Ionicons } from "@expo/vector-icons";
import { randomBytes, uuidV4 } from "ethers";
import { useNavigation } from "expo-router";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "react-native-sonner";
import CamFace from "../../components/camFace";
import Header from "../../components/header";
import VirtualKeypad from "../../components/VirtualKeypad";
import {
  createGlobalStyles,
  mainColor,
  secondaryColor,
} from "../../core/styles";
import {
  setAsyncStorageValue,
  setEncryptedStorageValue,
} from "../../core/utils";
import ContextModule from "../../providers/contextModule";
import { useSmartSize } from "../../providers/smartProvider";

// ─── STAGE COMPONENTS ──────────────────────────────────────────────────────

/**
 * Stage 0: Biometric/Face Scanning
 */
const FaceScanStage = ({ loading, take, onScan, setTake, normalize, GlobalStyles, navigation }) => (
  <ScrollView
    showsVerticalScrollIndicator={false}
    style={{ flex: 1, width: "100%" }}
    contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", paddingVertical: normalize(20), alignItems: 'center' }}
  >
    <View style={{ alignItems: 'center', width: '100%' }}>
      <View style={[GlobalStyles.screenHeaderContainer, { marginTop: 0 }]}>
        <Text style={[GlobalStyles.title, { textAlign: 'center' }]}>Face Verification</Text>
        <Text style={[GlobalStyles.subtitle, { textAlign: 'center', marginHorizontal: normalize(20) }]}>
          Center your face in the circle to securely create or verify your wallet
        </Text>
      </View>

      <View 
        style={[
          GlobalStyles.cameraRing, 
          { 
            width: normalize(230), 
            height: normalize(230), 
            borderRadius: normalize(115), 
            borderColor: loading ? mainColor + "77" : mainColor, 
            marginTop: normalize(20)
          }
        ]}
      >
        <View style={[GlobalStyles.cameraInner, { borderRadius: normalize(115) }]}>
          <CamFace size={normalize(230)} facing={"front"} take={take} onImage={onScan} />
        </View>
      </View>

      <View style={[GlobalStyles.loadingContainer, { height: normalize(40) }]}>
        {loading && (
          <>
            <ActivityIndicator color={mainColor} size="small" />
            <Text style={[GlobalStyles.loadingText, { color: mainColor }]}>Processing...</Text>
          </>
        )}
      </View>
    </View>

    {/* MIDDLE GROUP (BUTTON & SECURITY) */}
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Pressable
        disabled={loading}
        style={({ pressed }) => [
          GlobalStyles.buttonStyle,
          GlobalStyles.captureButton,
          {
            opacity: pressed ? 0.7 : 1,
            width: '90%',
            backgroundColor: loading ? mainColor + "77" : mainColor,
            borderColor: loading ? mainColor + "77" : mainColor
          }
        ]}
        onPress={async () => {
          await setTake(true);
          await setTake(false);
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={GlobalStyles.buttonText}>Scan Face</Text>
        )}
      </Pressable>

      <Text style={[GlobalStyles.secureNote, { textAlign: 'center', marginHorizontal: normalize(20), marginTop: normalize(8), opacity: 0.7 }]}>
        Biometrics are encrypted and never shared. 18+ only.
      </Text>

    </View>

    {/* BOTTOM GROUP (LEGAL) */}
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: '#666', fontSize: normalize(9), fontFamily: 'monospace' }}>By scanning, you agree to our</Text>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        <Pressable onPress={() => navigation.navigate("terms")}>
          <Text style={{ color: mainColor, fontSize: normalize(9), fontFamily: 'monospace', textDecorationLine: 'underline' }}>Terms of Use</Text>
        </Pressable>
        <Text style={{ color: '#666', fontSize: normalize(9), fontFamily: 'monospace' }}>&</Text>
        <Pressable onPress={() => navigation.navigate("privacy")}>
          <Text style={{ color: mainColor, fontSize: normalize(9), fontFamily: 'monospace', textDecorationLine: 'underline' }}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>

  </ScrollView>
);

/**
 * Stage 1, 2, 3: PIN Interaction (Verify, Setup, Confirm)
 */
const PinStage = ({
  stage,
  value,
  onKeypadPress,
  onBackspace,
  onMainAction,
  onBack,
  onSkip,
  loading,
  isError,
  mainColor,
  normalize,
  GlobalStyles,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
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
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  const titles = { 1: "Enter PIN", 2: "Setup Wallet PIN", 3: "Confirm PIN" };
  const subtitles = {
    1: "Verify your account to proceed",
    2: "Create a 4-digit security code for your wallet",
    3: "Please re-enter your 4-digit PIN to verify"
  };
  const buttonLabels = { 1: "Verify PIN", 2: "Set PIN", 3: "Confirm PIN" };

  return (
    <View style={{ flex: 1, width: "100%" }}>

      <ScrollView contentContainerStyle={styles.pinContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pinHeaderSection}>
          <Text style={styles.pinTitle}>{titles[stage]}</Text>
          <Text style={styles.pinSubtitle}>{subtitles[stage]}</Text>
        </View>

        <View style={styles.dotsContainer}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                value.length >= i ? { backgroundColor: mainColor, borderColor: mainColor } : { backgroundColor: 'transparent' },
                isError ? { backgroundColor: '#ff4444', borderColor: '#ff4444' } : null,
                loading ? {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.2],
                    outputRange: [1, 0.6]
                  })
                } : null
              ]}
            />
          ))}
        </View>

        <View style={{ width: "100%", paddingHorizontal: normalize(20) }}>
          <VirtualKeypad onPress={onKeypadPress} onBackspace={onBackspace} />
        </View>

        <Pressable
          disabled={value.length !== 4 || loading}
          style={({ pressed }) => [
            GlobalStyles.buttonStyle,
            GlobalStyles.captureButton,
            {
              backgroundColor: value.length === 4 ? mainColor : '#222',
              borderColor: 'transparent',
              opacity: (value.length !== 4 || loading || pressed) ? 0.7 : 1
            }
          ]}
          onPress={onMainAction}
        >

          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={[GlobalStyles.buttonText, { color: value.length === 4 ? 'white' : '#666' }]}>
              {buttonLabels[stage]}
            </Text>
          )}
        </Pressable>

        {stage === 2 && onSkip && (
          <TouchableOpacity style={{ marginTop: normalize(20), alignSelf: 'center' }} onPress={onSkip}>
            <Text style={{ color: '#666', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Skip for Now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export default function CreateOrRecover() {
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const navigation = useNavigation();
  const context = useContext(ContextModule);

  const [loading, setLoading] = useState(false);
  const [take, setTake] = useState(false);
  const [stage, setStage] = useState(0); 
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pendingWallet, setPendingWallet] = useState(null);
  const [pinError, setPinError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const changeStage = (newStage) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStage(newStage);
  };

  const completeSetup = useCallback((walletData, isPinSet = false) => {
    const { user, addresses } = walletData;
    // We only store a flag that security is enabled, never the actual PIN digits
    const pinFlag = isPinSet ? true : null;
    setEncryptedStorageValue({ user, pincode: pinFlag });
    setAsyncStorageValue({ addresses });
    context.setValue({ addresses, pincode: pinFlag });
    navigation.navigate("(screens)/main");
  }, [context, navigation]);


  const callApi = async (endpoint, body) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(body),
        redirect: "follow",
      });
      return await response.json();
    } catch (error) {
      return { result: null, error: "BAD REQUEST" };
    }
  };

  const createWallet = async (image) => {
    setLoading(true);
    const nonce = `face_${uuidV4(randomBytes(16))}`;
    const faceData = await callApi(`/api/createOrFetchFace`, { nonce, image });
    if (!faceData.result) {
      setLoading(false);
      return;
    }

    const userKey = typeof faceData.result === "string" ? faceData.result : nonce;
    const walletData = await callApi(`/api/createOrFetchWallet`, { user: userKey });
    
    if (walletData.result) {
      const { status } = walletData.result;
      setPendingWallet(walletData.result);
      if (status === "RECOVERED_WITH_PIN") {
        changeStage(1);
      } else {
        changeStage(2);
      }
    }
    setLoading(false);
  };

  const handleKeypadPress = (digit) => {
    if (stage === 1 || stage === 2) {
      if (pin.length < 4) setPin(pin + digit);
    } else if (stage === 3) {
      if (confirmPin.length < 4) setConfirmPin(confirmPin + digit);
    }
  };

  const handleBackspace = () => {
    if (stage === 1 || stage === 2) setPin(pin.slice(0, -1));
    else if (stage === 3) setConfirmPin(confirmPin.slice(0, -1));
  };

  const verifyPinAction = async () => {
    setLoading(true);
    const result = await callApi("/api/checkPin", {
      user: pendingWallet.user,
      pincode: pin
    });

    if (result.result === true) {
      setTimeout(() => {
        completeSetup(pendingWallet, true);
        toast.success("Security Verified", { description: "Account restored successfully." });
        setLoading(false);
        setAttempts(0);
      }, 1000);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPinError(true);
      
      if (newAttempts >= 3) {
        setTimeout(() => {
          setPin("");
          setPinError(false);
          setLoading(false);
          setAttempts(0);
          changeStage(0);
          toast.error("Verification Failed", { description: "Too many failed attempts. Please re-scan your face." });
        }, 1500);
      } else {
        setTimeout(() => {
          setPin("");
          setPinError(false);
          setLoading(false);
          toast.error("Incorrect PIN", { description: `You have ${3 - newAttempts} attempts remaining.` });
        }, 1500);
      }
    }
  };


  const setupPinAction = async () => {
    if (stage === 2) {
      changeStage(3);
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PIN Mismatch", { description: "The confirmation PIN does not match." });
      setConfirmPin("");
      changeStage(2);
      return;
    }
    setLoading(true);
    const result = await callApi(`/api/setupPin`, { user: pendingWallet.user, pincode: pin });
    if (result.error === null) {
      completeSetup(pendingWallet, true);
      toast.success("Security PIN Set", { description: "Your wallet is now protected." });
    } else {
      toast.error("Setup Failed", { description: "Could not sync PIN. Please try again." });
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <Header />
      {stage === 0 ? (
        <FaceScanStage 
          loading={loading} 
          take={take} 
          setTake={setTake} 
          onScan={createWallet} 
          normalize={normalize} 
          GlobalStyles={GlobalStyles} 
          navigation={navigation}
        />
      ) : (
        <PinStage
          stage={stage}
          value={stage === 3 ? confirmPin : pin}
          onKeypadPress={handleKeypadPress}
          onBackspace={handleBackspace}
          onMainAction={stage === 1 ? verifyPinAction : setupPinAction}
          onBack={() => {
            if (stage === 3) { changeStage(2); setConfirmPin(""); }
            else { changeStage(0); setPin(""); }
          }}
          onSkip={() => completeSetup(pendingWallet)}
          loading={loading}
          isError={pinError}
          mainColor={mainColor}
          normalize={normalize}
          GlobalStyles={GlobalStyles}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pinContent: { flexGrow: 1, alignItems: 'center', paddingTop: 20, paddingBottom: 40, justifyContent: 'space-between' },
  pinHeaderSection: { alignItems: 'center' },
  pinTitle: { color: 'white', fontSize: 24, fontFamily: 'Exo2_700Bold', marginBottom: 10 },
  pinSubtitle: { color: '#888', fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
  dotsContainer: { flexDirection: 'row', gap: 20 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#444' },
});


