import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createGlobalStyles } from "../../../core/styles";
import { useSmartSize } from "../../../providers/smartProvider";
import AmenitiesTab from "./tab1sub/AmenitiesTab";
import EventsTab from "./tab1sub/EventsTab";

export default function Tab1({ isActive }) {
  const [activeTab, setActiveTab] = useState("Amenities");
  const smartSize = useSmartSize();
  const GlobalStyles = createGlobalStyles(smartSize);

  useEffect(() => {
    if (isActive) console.log("Tab 1 is active");
  }, [isActive]);

  return (
    <View
      style={{
        flex: 1,
        width: smartSize.width,
        height: "100%",
        backgroundColor: "#000",
        alignSelf: "center",
      }}
    >
      <View style={GlobalStyles.tab1HeaderContainer}>
        <View style={GlobalStyles.tabContainer}>
          <TouchableOpacity
            style={[
              GlobalStyles.tabButton,
              activeTab === "Amenities" && GlobalStyles.activeTab,
            ]}
            onPress={() => setActiveTab("Amenities")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                GlobalStyles.tabText,
                activeTab === "Amenities" && GlobalStyles.activeTabText,
              ]}
            >
              Amenities
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              GlobalStyles.tabButton,
              activeTab === "Events" && GlobalStyles.activeTab,
            ]}
            onPress={() => setActiveTab("Events")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                GlobalStyles.tabText,
                activeTab === "Events" && GlobalStyles.activeTabText,
              ]}
            >
              Events
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {activeTab === "Amenities" ? <AmenitiesTab /> : <EventsTab />}
    </View>
  );
}
