import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "react-native-sonner";
import Header from "../../components/header";
import VirtualKeypad from "../../components/VirtualKeypad";
import {
  backgroundColor,
  createGlobalStyles,
  mainColor,
  whiteColor,
} from "../../core/styles";
import {
  setEncryptedStorageValue
} from "../../core/utils";
import ContextModule from "../../providers/contextModule";
import { useSmartSize } from "../../providers/smartProvider";

export default function PincodeSetup() {
  const context = useContext(ContextModule);
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState(0); // 0: Setup, 1: Confirm
  const [loading, setLoading] = useState(false);

  const handleDigitPress = (digit) => {
    if (step === 0) {
      if (pin.length < 4) setPin(pin + digit);
    } else {
      if (confirmPin.length < 4) setConfirmPin(confirmPin + digit);
    }
  };

  const handleBackspace = () => {
    if (step === 0) {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const nextStep = () => {
    if (pin.length === 4) {
      setStep(1);
    }
  };

  const savePin = async () => {
    if (pin !== confirmPin) {
      toast.error("PIN Mismatch", {
        description: "The confirmation PIN does not match. Please try again.",
      });
      setConfirmPin("");
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");

      const response = await fetch(`/api/setupPin`, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify({
          user: context.value.user,
          pincode: pin
        }),
        redirect: "follow",
      });

      const result = await response.json();

      if (result.error === null) {
        // 1. Save Locally (Only a flag, never the digits)
        await setEncryptedStorageValue({ pincode: true });

        // 2. Update Context
        context.setValue({ pincode: true });


        toast.success("Security PIN Set", {
          description: "Your wallet is now protected.",
        });

        setTimeout(() => {
          router.back();
        }, 500);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error("Failed to save PIN", error);
      toast.error("Setup Failed", {
        description: "Could not sync PIN with the server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentPin = step === 0 ? pin : confirmPin;
  const isComplete = currentPin.length === 4;

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor }]}>
      <Header />
      <View style={GlobalStyles.topBar}>
        <TouchableOpacity
          onPress={() => {
            if (step === 1) {
              setStep(0);
              setConfirmPin("");
            } else {
              router.back();
            }
          }}
          style={GlobalStyles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color={whiteColor} />
        </TouchableOpacity>
        <Text style={GlobalStyles.headerTitle}>Security</Text>
        <View style={{ width: "20%" }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: normalize(40) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>{step === 0 ? "Setup Wallet PIN" : "Confirm PIN"}</Text>
          <Text style={styles.subtitle}>
            {step === 0
              ? "Create a 4-digit security code for your wallet"
              : "Please re-enter your 4-digit PIN to verify"}
          </Text>
        </View>

        <View style={styles.dotsContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentPin.length >= i ? { backgroundColor: mainColor, borderColor: mainColor } : { backgroundColor: 'transparent' }
              ]}
            />
          ))}
        </View>
        <View style={{ width: "100%", paddingHorizontal: normalize(20) }}>
          <VirtualKeypad
            onPress={handleDigitPress}
            onBackspace={handleBackspace}
          />
        </View>

        <View style={[GlobalStyles.buttonGroup, { marginTop: normalize(40), width: '100%' }]}>
          <Pressable
            disabled={!isComplete || loading}
            style={[
              GlobalStyles.buttonStyle,
              GlobalStyles.captureButton,
              {
                backgroundColor: isComplete ? mainColor : '#222',
                borderColor: isComplete ? mainColor : '#222',
                opacity: (!isComplete || loading) ? 0.5 : 1
              }
            ]}
            onPress={step === 0 ? nextStep : savePin}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={[GlobalStyles.buttonText, { color: isComplete ? 'white' : '#666' }]}>
                {step === 0 ? "Set PIN" : "Confirm"}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Exo2_700Bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#444',
  },
});
