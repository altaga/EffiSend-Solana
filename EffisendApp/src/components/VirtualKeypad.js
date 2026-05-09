import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSmartSize } from "../providers/smartProvider";

const VirtualKeypad = ({ onPress, onBackspace, color = "white", showDot = false, randomize = false }) => {
  const { normalize } = useSmartSize();

  const digits = useMemo(() => {
    const base = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    if (randomize) {
      return [...base].sort(() => Math.random() - 0.5);
    }
    return base;
  }, [randomize]);

  const Key = ({ val, icon, style = {} }) => (
    <TouchableOpacity
      style={[styles.key, style]}
      onPress={() => (val !== null ? onPress(val) : onBackspace())}
    >
      {icon ? icon : <Text style={[styles.keyText, { color }]}>{val}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.keypad}>
      {/* Row 1 */}
      <View style={styles.keyRow}>
        <Key val={digits[0]} />
        <Key val={digits[1]} />
        <Key val={digits[2]} />
      </View>
      {/* Row 2 */}
      <View style={styles.keyRow}>
        <Key val={digits[3]} />
        <Key val={digits[4]} />
        <Key val={digits[5]} />
      </View>
      {/* Row 3 */}
      <View style={styles.keyRow}>
        <Key val={digits[6]} />
        <Key val={digits[7]} />
        <Key val={digits[8]} />
      </View>
      {/* Row 4 */}
      <View style={styles.keyRow}>
        {showDot ? (
          <Key val="." />
        ) : (
          <View
            style={[
              styles.key,
              { backgroundColor: "transparent", borderColor: "transparent" },
            ]}
          />
        )}
        <Key val={digits[9]} />
        <Key val={null} icon={<Ionicons name="backspace-outline" size={normalize(28)} color={color} />} />
      </View>
    </View>
  );
};



const styles = StyleSheet.create({
  keypad: {
    width: "100%",
    gap: 10,
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  key: {
    flex: 1,
    aspectRatio: 1.8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  keyText: {
    fontSize: 28,
    fontFamily: "Exo2_700Bold",
  },
});

export default VirtualKeypad;
