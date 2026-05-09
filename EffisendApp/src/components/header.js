import { Image } from "expo-image";
import { Text, View } from "react-native";
import Renders from "../assets/images/logo.png";
import Title from "../assets/images/title.png";
import { appVersion, versionFlag } from "../core/constants";
import { createGlobalStyles } from "../core/styles";
import { useSmartSize } from "../providers/smartProvider";

export default function Header() {
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);
  const headerHeight = normalize(70);

  return (
    <View style={[GlobalStyles.header, { height: headerHeight }, GlobalStyles.ph5]}>
      {versionFlag && (
        <Text
          style={{
            position: "absolute",
            top: normalize(5),
            right: normalize(10),
            fontSize: normalize(10),
            color: "#666",
            zIndex: 10,
            fontWeight: "bold"
          }}
        >
          v{appVersion}
        </Text>
      )}
      {/* Ensure header has height */}
      <View
        style={[
          GlobalStyles.headerItem,
          GlobalStyles.flex1,
          { alignItems: "flex-start" },
        ]}
      >
        <Image
          source={Renders}
          contentFit="contain"
          style={{
            height: "80%",
            width: "auto",
            aspectRatio: 1,
          }}
        />
      </View>
      <View
        style={[
          GlobalStyles.headerItem,
          GlobalStyles.flex1,
          { alignItems: "flex-end" },
        ]}
      >
        <Image
          source={Title}
          contentFit="contain"
          style={{
            height: "100%",
            width: "100%",
            aspectRatio: 1,
          }}
        />
      </View>
    </View>
  );
}
