import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { createGlobalStyles, mainColor, secondaryColor } from "../core/styles";
import { useSmartSize } from "../providers/smartProvider";

// Create animated version of Ionicons for the breathing effect
const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

export default function CamFace({ onImage, take, facing: initialFacing = "front", size }) {
  const [cameraReady, setCameraReady] = useState(false);
  const [refresh, setRefresh] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState(initialFacing);

  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);

  const cameraRef = useRef(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  // ─── LIFECYCLE & ANIMATION ──────────────────────────────────────────────────

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200, // Matches a resting human heart rate/breath
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => {
      pulse.stop();
      setRefresh(false);
    };
  }, [pulseAnim]);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || isProcessing) return;

    try {
      const options = { quality: 1, base64: true };
      const result = await cameraRef.current.takePictureAsync(options);

      // 1. Immediately kill camera hardware to free memory for manipulation
      setIsProcessing(true);
      setRefresh(false);
      setCameraReady(false);

      let finalBase64;
      // 2. Perform Image Manipulation (Resizing to 512px)
      if (result.width > 512 || result.height > 512) {
        const resizeOption =
          result.width > result.height ? { width: 512 } : { height: 512 };

        const manipulatedImage = await ImageManipulator.manipulateAsync(
          result.uri,
          [{ resize: resizeOption }],
          { base64: true, format: "jpeg" },
        );
        finalBase64 = manipulatedImage.base64;
      } else {
        finalBase64 = result.base64;
      }

      // 3. Notify parent. UI stays in 'isProcessing' state until parent unmounts this.
      onImage(finalBase64);
    } catch (error) {
      console.error("Capture Error:", error);
      // On error, reset to allow the user to try again
      setIsProcessing(false);
      setRefresh(true);
    }
  }, [cameraReady, isProcessing, onImage]);

  useEffect(() => {
    if (take && cameraReady && refresh && !isProcessing) {
      takePicture();
    }
  }, [take, cameraReady, refresh, isProcessing, takePicture]);

  // Interpolate pulse values for the glow and icon breathing
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.5],
  });

  const ringScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const iconColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [secondaryColor, "#ffffff"],
  });

  // Dynamic styles based on size prop
  const containerStyle = [
    GlobalStyles.camFillView,
    size ? { width: size, height: size, borderRadius: size / 2, overflow: "hidden" } : {}
  ];

  const pulseStyle = [
    GlobalStyles.pulseOverlay,
    size ? { width: size, height: size, borderRadius: size / 2 } : { borderRadius: normalize(140) },
    {
      opacity: pulseOpacity,
      transform: [{ scale: ringScale }],
    },
  ];

  return (
    <View style={containerStyle}>
      {/* 1. THE CAMERA VIEW */}
      {refresh && (
        <CameraView
          onCameraReady={() => setCameraReady(true)}
          ratio={"1:1"}
          facing={facing}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* 2. PROCESSING / SCANNING OVERLAY */}
      {isProcessing && (
        <View
          style={[
            StyleSheet.absoluteFill,
            GlobalStyles.centerAll,
            { backgroundColor: "rgba(0,0,0,0.7)" }, // High contrast for the pulse
          ]}
        >
          {/* The Breathing Glow */}
          <Animated.View
            style={pulseStyle}
          />

          {/* Biometric Scan Icons */}
          <AnimatedIonicons
            name="scan-outline"
            size={normalize(150)}
            style={[
              GlobalStyles.onboardingInnerIcon,
              { color: iconColor },
            ]}
          />
          <AnimatedIonicons
            name="happy"
            size={normalize(75)}
            style={[
              GlobalStyles.onboardingInnerIcon,
              { color: iconColor },
            ]}
          />
        </View>
      )}

      {/* 3. CAMERA CONTROLS */}
      {refresh && !isProcessing && (
        <View style={GlobalStyles.camFlipOverlay}>
          <Pressable
            onPress={() => {
              setRefresh(false);
              setTimeout(() => {
                setFacing(prev => prev === "back" ? "front" : "back");
                setRefresh(true);
              }, 100);
            }}
            style={[
              GlobalStyles.camFlipButton,
              { backgroundColor: mainColor + "80" }, // Translucent background
            ]}
          >
            <MaterialIcons name="cameraswitch" size={normalize(22)} color="white" />
          </Pressable>
        </View>
      )}
    </View>
  );
}
