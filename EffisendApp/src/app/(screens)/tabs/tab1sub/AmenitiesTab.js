import { FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import TextTicker from "react-native-text-ticker";

// --- Core Styles & Providers ---
import { createGlobalStyles, mainColor } from "../../../../core/styles";
import { useSmartSize } from "../../../../providers/smartProvider";
import amenitiesDetails from "../../../../datasets/amenities_details.json";
import eventsData from "../../../../datasets/tokyo_dome_events.json";

const SCROLLABLE_TABS = [
  { id: "tdc", name: "Tokyo Dome" },
  { id: "sr", name: "Shop & Restaurants" },
  { id: "slq", name: "Spa LaQua" },
  { id: "tdca", name: "Attractions" },
  { id: "aso", name: "ASO Bono!" },
  { id: "stt", name: "Space Travelium TeNQ" },
  { id: "tdgr", name: "Theater G-Rosso" },
];

const FALLBACK_IMAGES = {
  Concert: require("../../../../assets/events/Concert.png"),
  Musical: require("../../../../assets/events/Musical.png"),
  Stage: require("../../../../assets/events/Stage.png"),
  "Hero Show": require("../../../../assets/events/HeroShow.png"),
  Baseball: require("../../../../assets/events/Baseball.png"),
  Sports: require("../../../../assets/events/Sports.png"),
  Boxing: require("../../../../assets/events/Boxing.png"),
  "Martial Arts": require("../../../../assets/events/MartialArts.png"),
  "Pro-wrestling": require("../../../../assets/events/ProWrestling.png"),
  Exhibition: require("../../../../assets/events/Exhibition.png"),
  "Job Fair": require("../../../../assets/events/JobFair.png"),
  Campaign: require("../../../../assets/events/Campaign.png"),
  "Tokyo Dome City": require("../../../../assets/events/TokyoDomeCity.png"),
  "Spa LaQua": require("../../../../assets/events/SpaLaQua.png"),
  Attractions: require("../../../../assets/events/Attractions.png"),
  Event: require("../../../../assets/events/Event.png"),
  Other: require("../../../../assets/events/Other.png"),
  default: require("../../../../assets/events/Default.png"),
};

// Minimalist Design Constants
const CARD_RADIUS = 16;
const BG_ELEVATED = "#1C1C1E";
const TEXT_SECONDARY = "#8E8E93";

const WebHorizontalScrollView = ({ children, style, contentContainerStyle, ...props }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      const node = scrollRef.current?.getScrollableNode
        ? scrollRef.current.getScrollableNode()
        : scrollRef.current;

      if (!node) return;

      const handleWheel = (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          node.scrollLeft += e.deltaY;
        }
      };

      node.addEventListener("wheel", handleWheel, { passive: false });
      return () => node.removeEventListener("wheel", handleWheel);
    }
  }, []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      ref={scrollRef}
      style={style}
      contentContainerStyle={contentContainerStyle}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

const formatEventDate = (fromMs, toMs) => {
  const options = { month: "short", day: "numeric" };
  const fromDate = new Date(fromMs);
  const toDate = new Date(toMs);
  const fromStr = fromDate.toLocaleDateString("en-US", options);
  const toStr = toDate.toLocaleDateString("en-US", options);
  const year = toDate.getFullYear();

  if (fromMs === toMs) return `${fromStr}, ${year}`;
  return `${fromStr} – ${toStr}, ${year}`;
};

export default function AmenitiesTab() {
  const [selectedAmenityCat, setSelectedAmenityCat] = useState("tdc");
  const [refreshing, setRefreshing] = useState(false);
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const handleOpenURL = (url) => {
    if (!url || url === "NA") return;
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url).catch((err) => console.error("URL failed:", err));
    }
  };

  const currentWidgets = amenitiesDetails[selectedAmenityCat]?.widgets || [];
  const currentSocials = amenitiesDetails[selectedAmenityCat]?.socials || [];
  const currentTabName = SCROLLABLE_TABS.find((t) => t.id === selectedAmenityCat)?.name;

  const renderWidget = (widget, index) => {
    switch (widget.type) {
      case "ticker_card":
        return (
          <View
            key={`ticker-${index}`}
            style={{
              marginHorizontal: normalize(16),
              backgroundColor: BG_ELEVATED,
              borderRadius: normalize(12),
              flexDirection: "row",
              paddingVertical: normalize(12),
              paddingHorizontal: normalize(16),
              alignItems: "center",
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#34C759", marginRight: 10 }} />
            <View style={{ flex: 1, overflow: "hidden" }}>
              <TextTicker
                style={{
                  fontSize: normalize(13),
                  fontWeight: "500",
                  color: "#FFF",
                  fontFamily: "Exo2_400Regular",
                }}
                duration={12000}
                loop
                bounce={false}
                repeatSpacer={50}
                marqueeDelay={1000}
              >
                {widget.text}
              </TextTicker>
            </View>
          </View>
        );

      case "banner": {
        if (widget.eventId) {
          const event = eventsData.find((e) => e.id === widget.eventId);
          if (!event) return null;

          const imageSource = event.thumbnail ? { uri: event.thumbnail } : FALLBACK_IMAGES[event.category] || FALLBACK_IMAGES.default;

          return (
            <View key={`banner-${index}`} style={{ paddingHorizontal: normalize(16), gap: normalize(12) }}>
              <View style={{ borderRadius: normalize(CARD_RADIUS), overflow: "hidden", backgroundColor: BG_ELEVATED }}>
                <Image source={imageSource} style={{ width: "100%", height: normalize(200) }} contentFit="cover" />
                <View style={{ position: "absolute", bottom: 0, width: "100%", padding: normalize(16), backgroundColor: "rgba(0,0,0,0.6)" }}>
                   <Text style={{ color: "#FFF", fontSize: normalize(11), fontWeight: "900", marginBottom: 4 }}>
                    {event.category.toUpperCase()}
                  </Text>
                  <Text style={{ color: "#FFF", fontSize: normalize(20), fontFamily: "Exo2_700Bold", letterSpacing: -0.5 }}>
                    {event.title}
                  </Text>
                </View>
              </View>
              {event.url && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#FFF",
                    paddingVertical: normalize(14),
                    borderRadius: normalize(12),
                    alignItems: "center",
                  }}
                  onPress={() => handleOpenURL(event.url)}
                >
                  <Text style={{ color: "#000", fontSize: normalize(14), fontWeight: "700" }}>Get Tickets</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }
        return null;
      }

      case "section_title":
        return (
          <View key={`title-${index}`} style={{ paddingHorizontal: normalize(16), marginTop: normalize(8) }}>
            <Text style={{ color: "#FFF", fontSize: normalize(22), fontFamily: "Exo2_700Bold", letterSpacing: -0.5 }}>
              {widget.title}
            </Text>
          </View>
        );

      case "events_slider": {
        const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const filteredEvents = eventsData.filter((evt) => {
          const matchPlace = evt.placeName === currentTabName || widget.bypass;
          const categories = widget.categories || [];
          const hasAll = categories.some((cat) => cat.toLowerCase() === "all");
          const matchCategory = categories.length === 0 || hasAll || categories.includes(evt.category);
          const matchTime = evt.to >= (now + widget.weekFrom * ONE_WEEK_MS) && evt.from <= (now + widget.weekTo * ONE_WEEK_MS);
          return matchPlace && matchCategory && matchTime;
        });

        if (filteredEvents.length === 0) return null;

        return (
          <View key={`slider-${index}`} style={{ gap: normalize(12) }}>
            <WebHorizontalScrollView style={{ paddingLeft: normalize(16) }} contentContainerStyle={{ paddingRight: normalize(32) }}>
              {filteredEvents.sort((a, b) => a.from - b.from).map((evt) => {
                const imageSource = evt.thumbnail ? { uri: evt.thumbnail } : FALLBACK_IMAGES[evt.category] || FALLBACK_IMAGES.default;
                return (
                  <TouchableOpacity
                    key={`card-${evt.id}`}
                    style={{ width: normalize(220), marginRight: normalize(16) }}
                    activeOpacity={0.8}
                    onPress={() => handleOpenURL(evt.url)}
                  >
                    <Image source={imageSource} style={{ width: "100%", height: normalize(140), borderRadius: normalize(12), backgroundColor: BG_ELEVATED }} contentFit="cover" />
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ color: "#FFF", fontSize: normalize(15), fontFamily: "Exo2_700Bold" }} numberOfLines={1}>{evt.title}</Text>
                      <Text style={{ color: TEXT_SECONDARY, fontSize: normalize(12), marginTop: 2 }}>{formatEventDate(evt.from, evt.to)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </WebHorizontalScrollView>
          </View>
        );
      }

      case "useful_links":
        return (
          <View key={`links-${index}`} style={{ paddingHorizontal: normalize(16), gap: normalize(12) }}>
            <View style={{ gap: 1 }}>
              {widget.links.map((link, i) => (
                <TouchableOpacity
                  key={`link-${i}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: BG_ELEVATED,
                    padding: normalize(16),
                    borderRadius: normalize(12),
                    marginBottom: normalize(8),
                  }}
                  onPress={() => handleOpenURL(link.url)}
                >
                  <MaterialCommunityIcons name={link.icon} size={22} color={mainColor} style={{ marginRight: 16 }} />
                  <Text style={{ color: "#FFF", flex: 1, fontWeight: "600", fontSize: normalize(15) }}>{link.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case "notice_list":
        return (
          <View key={`notices-${index}`} style={{ paddingHorizontal: normalize(16), gap: normalize(12) }}>
            {widget.notices.map((notice, i) => (
              <TouchableOpacity
                key={`notice-${i}`}
                style={{
                  padding: normalize(16),
                  backgroundColor: BG_ELEVATED,
                  borderRadius: normalize(12),
                  borderWidth: notice.isImportant ? 1 : 0,
                  borderColor: notice.isImportant ? mainColor : "transparent",
                }}
                onPress={() => handleOpenURL(notice.url)}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: notice.isImportant ? mainColor : TEXT_SECONDARY, fontWeight: "800", fontSize: normalize(11) }}>{notice.tag}</Text>
                  <Text style={{ color: TEXT_SECONDARY, fontSize: normalize(11) }}>{notice.date}</Text>
                </View>
                <Text style={{ color: "#FFF", fontSize: normalize(15), fontWeight: "600", lineHeight: normalize(20) }}>{notice.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      default: return null;
    }
  };

  return (
    <View style={{ flex: 1, height: "100%", width: smartSize.width, alignSelf: "center", backgroundColor: "#000", overflow: "hidden" }}>
      {/* MINIMALIST NAVIGATOR */}
      <View style={{ width: "100%", borderBottomWidth: 1, borderBottomColor: "#1C1C1E" }}>
        <WebHorizontalScrollView
          style={{ paddingVertical: normalize(14) }}
          contentContainerStyle={{ paddingLeft: normalize(16), paddingRight: normalize(32) }}
        >
          {SCROLLABLE_TABS.map((tab) => {
            const isActive = selectedAmenityCat === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setSelectedAmenityCat(tab.id)}
                style={{
                  paddingHorizontal: normalize(18),
                  paddingVertical: normalize(8),
                  borderRadius: normalize(22),
                  backgroundColor: isActive ? mainColor : "#1C1C1E",
                  marginRight: normalize(8),
                }}
              >
                <Text style={{ color: isActive ? "#FFF" : TEXT_SECONDARY, fontWeight: "600", fontSize: normalize(13) }}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </WebHorizontalScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mainColor} />}
        contentContainerStyle={{ 
          width: "100%", 
          paddingVertical: normalize(24), 
          gap: normalize(32), 
          paddingBottom: normalize(80) 
        }}
        style={{ flex: 1, width: "100%" }}
      >
        {currentWidgets.map((widget, index) => renderWidget(widget, index))}

        {/* SOCIALS */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: normalize(20), paddingVertical: 10 }}>
          {currentSocials.map((social, index) => {
            let IconComponent = MaterialCommunityIcons;
            let iconName = social.platform === "twitter" ? "x-twitter" : social.platform;
            if (social.platform === "twitter") IconComponent = FontAwesome6;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleOpenURL(social.url)}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: BG_ELEVATED, justifyContent: "center", alignItems: "center" }}
              >
                <IconComponent name={iconName} size={20} color={social.color} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
