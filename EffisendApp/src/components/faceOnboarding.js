import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { createGlobalStyles, mainColor } from "../core/styles";
import { useSmartSize } from "../providers/smartProvider";

export default function FaceOnboarding({ onStart }) {
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const router = useRouter();

  return (
    <View style={[GlobalStyles.onboardingContainer, { justifyContent: 'space-between', paddingVertical: normalize(40) }]}>
      {/* TOP GROUP */}
      <View style={{ alignItems: 'center', width: '100%' }}>
        <View style={[GlobalStyles.onboardingIconContainer, { marginBottom: normalize(20) }]}>
          <Ionicons name="scan-outline" size={normalize(63)} color={mainColor} />
          <Ionicons
            name="happy"
            size={normalize(30)}
            color={mainColor}
            style={[GlobalStyles.onboardingInnerIcon, { top: '35%', left: '35%' }]}
          />
        </View>

        <Text style={[GlobalStyles.title, { textAlign: 'center', marginBottom: normalize(16) }]}>
          Create or Recover Wallet
        </Text>

        <Text style={[GlobalStyles.subtitle, { textAlign: 'center', paddingHorizontal: normalize(20) }]}>
          Use Face ID to securely generate a new wallet or instantly restore your existing wallet.
        </Text>
      </View>

      {/* MIDDLE GROUP (BUTTON & SECURITY NOTE) */}
      <View style={{ width: '100%', alignItems: 'center' }}>
        <Pressable
          style={({ pressed }) => [
            GlobalStyles.onboardingButton,
            { opacity: pressed ? 0.7 : 1, width: '100%' },
          ]}
          onPress={onStart}
        >
          <Text style={GlobalStyles.buttonText}>Start Process</Text>
        </Pressable>

        <Text style={[GlobalStyles.privacyText, { fontSize: normalize(10), opacity: 0.65, textAlign: 'center', marginTop: normalize(12) }]}>
          Biometrics are encrypted and never shared. 18+ only.
        </Text>
      </View>

      {/* BOTTOM GROUP (LEGAL LINKS) */}
      <View style={[GlobalStyles.onboardingFooter, { alignItems: 'center' }]}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#666', fontSize: normalize(9), fontFamily: 'monospace' }}>By scanning, you agree to our</Text>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <Pressable onPress={() => router.push("/privacy")}>
              <Text style={{ color: mainColor, fontSize: normalize(9), fontFamily: 'monospace', textDecorationLine: 'underline' }}>Terms of Use</Text>
            </Pressable>
            <Text style={{ color: '#666', fontSize: normalize(9), fontFamily: 'monospace' }}>&</Text>
            <Pressable onPress={() => router.push("/privacy")}>
              <Text style={{ color: mainColor, fontSize: normalize(9), fontFamily: 'monospace', textDecorationLine: 'underline' }}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>
      </View>

    </View>


  );
}