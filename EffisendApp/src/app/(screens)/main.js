import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useNavigation } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AgentB from "../../assets/images/agentB.png";
import AgentW from "../../assets/images/agentW.png";
import Header from "../../components/header";
import {
  createGlobalStyles,
  mainColor,
  whiteColor,
} from "../../core/styles";
import { postHogEvent } from "../../core/utils";
import ContextModule from "../../providers/contextModule";
import { useSmartSize } from "../../providers/smartProvider";
import Tab1 from "./tabs/tab1";
import Tab2 from "./tabs/tab2";
import Tab3 from "./tabs/tab3";
import Tab4 from "./tabs/tab4";
import Tab5 from "./tabs/tab5";

const TABS = [
  {
    label: "Home",
    Component: Tab1,
    IconLib: FontAwesome5,
    icon: "home",
    crypto: false,
  },
  {
    label: "Map",
    Component: Tab2,
    IconLib: FontAwesome5,
    icon: "map",
    crypto: false,
  },
  { label: "Agent", Component: Tab3, isImage: true, crypto: false },
  {
    label: "Wallet",
    Component: Tab4,
    IconLib: MaterialIcons,
    icon: "account-balance-wallet",
    crypto: true,
  },
  {
    label: "Passes",
    Component: Tab5,
    IconLib: Ionicons,
    icon: "ticket",
    crypto: true,
  },
];

export default function MainComponent() {
  const [tab, setTab] = useState(0);
  const { value } = useContext(ContextModule);
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const navigation = useNavigation();

  const currentIconSize = normalize(24);

  useEffect(() => {
    if (!value.starter) {
      navigation.navigate("index");
    }
    const state = navigation.getState();
    const previousRouteName = state?.routes[state.index - 1]?.name;
    previousRouteName === "index" &&
      value.starter &&
      postHogEvent("page_viewed");
  }, [value.starter, navigation]);

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <Header />
      <View style={GlobalStyles.main}>
        {TABS.map((item, index) => {
          const isActive = tab === index;
          const TabComponent = item.Component;

          return (
            <View
              key={item.label}
              style={[
                GlobalStyles.flex1,
                GlobalStyles.w100,
                !isActive && { display: "none" },
              ]}
            >
              <TabComponent navigation={navigation} isActive={isActive} />
            </View>
          );
        })}
      </View>

      <View style={GlobalStyles.footer}>
        {TABS.map((item, index) => {
          const isActive = tab === index;
          return (
            <Pressable
              key={item.label}
              style={GlobalStyles.selector}
              onPress={() => setTab(index)}
            >
              {item.isImage ? (
                <Image
                  source={isActive ? AgentB : AgentW}
                  style={{
                    width: currentIconSize,
                    height: currentIconSize,
                    borderRadius: 10,
                  }}
                />
              ) : item.crypto && value.addresses.evm === "" ? (
                <FontAwesome5
                  name={"lock"}
                  size={currentIconSize}
                  color={isActive ? mainColor : whiteColor}
                />
              ) : (
                <item.IconLib
                  name={item.icon}
                  size={currentIconSize}
                  color={isActive ? mainColor : whiteColor}
                />
              )}
              <Text
                style={
                  isActive
                    ? GlobalStyles.selectorSelectedText
                    : GlobalStyles.selectorText
                }
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
