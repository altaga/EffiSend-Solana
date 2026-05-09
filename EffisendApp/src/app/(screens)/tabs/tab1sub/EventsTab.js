import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { createGlobalStyles, mainColor } from "../../../../core/styles";
import eventsData from "../../../../datasets/tokyo_dome_events.json";
import { useSmartSize } from "../../../../providers/smartProvider";

// --- Asset Mapping ---
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

const CATEGORY_THEMES = {
  Concert: { color: "#ab47bc" },
  Musical: { color: "#26c6da" },
  Stage: { color: "#9575cd" },
  "Hero Show": { color: "#ff5252" },
  Baseball: { color: "#ff9800" },
  Sports: { color: "#42a5f5" },
  Boxing: { color: "#ef5350" },
  "Martial Arts": { color: "#ff7043" },
  "Pro-wrestling": { color: "#d4e157" },
  Exhibition: { color: "#66bb6a" },
  "Job Fair": { color: "#7986cb" },
  Campaign: { color: "#ffca28" },
  "Tokyo Dome City": { color: "#29b6f6" },
  "Spa LaQua": { color: "#4dd0e1" },
  Attractions: { color: "#e91e63" },
  Event: { color: "#03a9f4" },
  Other: { color: "#8e8e93" },
  default: { color: mainColor || "#03a9f4" },
};

const monthsMap = {
  0: "Jan",
  1: "Feb",
  2: "Mar",
  3: "Apr",
  4: "May",
  5: "Jun",
  6: "Jul",
  7: "Aug",
  8: "Sep",
  9: "Oct",
  10: "Nov",
  11: "Dec",
};

// --- Helper: Format Dates from Timestamps ---
const formatEventDate = (fromTimestamp, toTimestamp) => {
  if (!fromTimestamp) return "";
  const fromDate = new Date(fromTimestamp);
  const fromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`;

  if (!toTimestamp || fromTimestamp === toTimestamp) return fromStr;

  const toDate = new Date(toTimestamp);
  const toStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;

  return `${fromStr} ~ ${toStr}`;
};

// --- Extract Filter Data ---
const uniqueMonthsISO = [
  ...new Set(
    eventsData
      .map((e) => {
        if (!e.from) return null;
        const d = new Date(e.from);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })
      .filter(Boolean),
  ),
].sort();

const monthsData = ["All", ...uniqueMonthsISO];

const uniqueCategories = [
  ...new Set(eventsData.map((e) => e.category).filter(Boolean)),
].sort();
const categoriesData = ["All", ...uniqueCategories];

const formatMonthLabel = (iso) => {
  if (iso === "All") return "All Months";
  const [year, month] = iso.split("-");
  return `${monthsMap[parseInt(month) - 1]} ${year}`;
};

// Fixed to prevent the generic "Event" from looking like a bug in the dropdown
const formatCategoryLabel = (cat) => {
  if (cat === "All") return "All Categories";
  if (cat === "Event") return "Special Events"; // Clarifies the label in the UI
  return cat;
};

export default function EventsTab() {
  const smartSize = useSmartSize();
  const { width, height, width: phoneWidth } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);

  const [refreshing, setRefreshing] = useState(false);
  // ... rest of state ...
// (skipping state lines for brevity in instruction, will match in target)
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const isRefreshingRef = useRef(false);

  const onRefresh = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }, 2000);
  };

  const handleOpenURL = (url) => {
    if (!url) return;
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url).catch((err) =>
        console.error("Failed to open URL:", err),
      );
    }
  };

  const filteredEvents = useMemo(() => {
    return (
      eventsData
        .filter((item) => {
          let matchMonth = true;
          if (selectedMonth !== "All") {
            const d = new Date(item.from);
            const itemMonthISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            matchMonth = itemMonthISO === selectedMonth;
          }
          const matchCategory =
            selectedCategory === "All" || item.category === selectedCategory;
          return matchMonth && matchCategory;
        })
        // SORT APPLIED HERE: Soonest events first
        .sort((a, b) => (a.from || 0) - (b.from || 0))
    );
  }, [selectedMonth, selectedCategory]);

  const renderEventCard = (item, index) => {
    const theme = CATEGORY_THEMES[item.category] || CATEGORY_THEMES.default;
    const timeDisplay =
      item.fromTime && item.toTime
        ? `${item.fromTime} - ${item.toTime}`
        : item.fromTime || "";

    // Generate date string dynamically from timestamps
    const displayDate = formatEventDate(item.from, item.to);

    const imageSource = item.thumbnail
      ? { uri: item.thumbnail }
      : FALLBACK_IMAGES[item.category] || FALLBACK_IMAGES.default;

    return (
      <TouchableOpacity
        key={item.id || index}
        style={GlobalStyles.eventPassCard}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedEvent(item);
          setModalVisible(true);
        }}
      >
        <View style={GlobalStyles.cardHeader}>
          <Text style={GlobalStyles.dateText}>{displayDate}</Text>
          <View
            style={[
              GlobalStyles.categoryBadge,
              { backgroundColor: theme.color + "22", borderColor: theme.color },
            ]}
          >
            <Text style={[GlobalStyles.categoryText, { color: theme.color }]}>
              {item.category}
            </Text>
          </View>
        </View>
        <View style={GlobalStyles.cardMainContent}>
          <View style={{ flex: 1 }}>
            <Text style={GlobalStyles.titleText}>{item.title}</Text>
            {timeDisplay ? (
              <View style={GlobalStyles.detailRow}>
                <Ionicons name="time-outline" size={14} color="#8a8a8e" />
                <Text style={GlobalStyles.detailText}>{timeDisplay}</Text>
              </View>
            ) : null}
          </View>
          <Image
            source={imageSource}
            style={GlobalStyles.cardThumbnail}
            contentFit="cover"
            contentPosition="top center"
            transition={200}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPickerModal = (
    visible,
    data,
    selectedValue,
    onSelect,
    formatLabel,
    title,
  ) => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      hardwareAccelerated
      onRequestClose={() => onSelect(selectedValue)}
    >
      <View style={GlobalStyles.fullScreenCentered}>
        <View style={[GlobalStyles.smartSizeContainer, { width, height }]}>
          <View style={GlobalStyles.pickerBox}>
            <View style={GlobalStyles.modalHeader}>
              <Text style={GlobalStyles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={() => onSelect(selectedValue)}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ marginTop: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {data.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    GlobalStyles.pickerItem,
                    selectedValue === item
                      ? GlobalStyles.pickerItemSelected
                      : {},
                  ]}
                  onPress={() => onSelect(item)}
                >
                  <Text
                    style={[
                      GlobalStyles.pickerItemText,
                      selectedValue === item
                        ? GlobalStyles.pickerItemTextSelected
                        : {},
                    ]}
                  >
                    {formatLabel(item)}
                  </Text>
                  {selectedValue === item && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={mainColor || "#03a9f4"}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[GlobalStyles.eventsContainer, { width: smartSize.width, height: "100%", alignSelf: "center", overflow: "hidden" }]}>
      <View style={GlobalStyles.pickerButtonsContainer}>
        <TouchableOpacity
          style={GlobalStyles.dropdownButton}
          activeOpacity={0.7}
          onPress={() => setMonthPickerVisible(true)}
        >
          <Text style={GlobalStyles.dropdownButtonText} numberOfLines={1}>
            {formatMonthLabel(selectedMonth)}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#aaaaaa" />
        </TouchableOpacity>
        <TouchableOpacity
          style={GlobalStyles.dropdownButton}
          activeOpacity={0.7}
          onPress={() => setCategoryPickerVisible(true)}
        >
          <Text style={GlobalStyles.dropdownButtonText} numberOfLines={1}>
            {formatCategoryLabel(selectedCategory)}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#aaaaaa" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={mainColor}
          />
        }
      >
        <View style={GlobalStyles.eventsListContainer}>
          {filteredEvents.length > 0 ? (
            filteredEvents.map((item, index) => renderEventCard(item, index))
          ) : (
            <View style={GlobalStyles.emptyContainer}>
              <Text style={[GlobalStyles.emptyText, { fontSize: 16 }]}>
                No events found for this selection.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {renderPickerModal(
        monthPickerVisible,
        monthsData,
        selectedMonth,
        (v) => {
          setSelectedMonth(v);
          setMonthPickerVisible(false);
        },
        formatMonthLabel,
        "Select Month",
      )}

      {renderPickerModal(
        categoryPickerVisible,
        categoriesData,
        selectedCategory,
        (v) => {
          setSelectedCategory(v);
          setCategoryPickerVisible(false);
        },
        formatCategoryLabel,
        "Select Category",
      )}

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        hardwareAccelerated
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={GlobalStyles.fullScreenCentered}>
          <View style={[GlobalStyles.smartSizeContainer, { width, height }]}>
            <View style={GlobalStyles.modalContent}>
              {selectedEvent && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={{ alignSelf: "flex-end", marginBottom: 10 }}
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={28} color="white" />
                  </TouchableOpacity>

                  <Image
                    source={
                      selectedEvent.thumbnail
                        ? { uri: selectedEvent.thumbnail }
                        : FALLBACK_IMAGES[selectedEvent.category] ||
                          FALLBACK_IMAGES.default
                    }
                    style={GlobalStyles.modalImage}
                    contentFit={selectedEvent.thumbnail ? "cover" : "contain"}
                    transition={200}
                  />

                  <Text
                    style={[
                      GlobalStyles.modalTitleDetail,
                      { marginBottom: 15 },
                    ]}
                  >
                    {selectedEvent.title}
                  </Text>

                  <View style={GlobalStyles.modalBadgeRow}>
                    <View
                      style={[
                        GlobalStyles.categoryBadge,
                        {
                          backgroundColor:
                            (CATEGORY_THEMES[selectedEvent.category]?.color ||
                              mainColor) + "22",
                          borderColor:
                            CATEGORY_THEMES[selectedEvent.category]?.color ||
                            mainColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          GlobalStyles.categoryText,
                          {
                            color:
                              CATEGORY_THEMES[selectedEvent.category]?.color ||
                              mainColor,
                          },
                        ]}
                      >
                        {selectedEvent.category}
                      </Text>
                    </View>
                    <Text style={GlobalStyles.modalDateText}>
                      {formatEventDate(selectedEvent.from, selectedEvent.to)}
                    </Text>
                  </View>

                  {(selectedEvent.placeName ||
                    selectedEvent.fromTime ||
                    selectedEvent.telephone) && (
                    <View style={GlobalStyles.modalBodyInfo}>
                      {selectedEvent.placeName && (
                        <View style={GlobalStyles.modalDetailRow}>
                          <Ionicons
                            name="location-outline"
                            size={18}
                            color={mainColor}
                          />
                          <Text style={GlobalStyles.modalDetailInfo}>
                            {selectedEvent.placeName}
                          </Text>
                        </View>
                      )}
                      {(selectedEvent.fromTime || selectedEvent.toTime) && (
                        <View style={GlobalStyles.modalDetailRow}>
                          <Ionicons
                            name="time-outline"
                            size={18}
                            color={mainColor}
                          />
                          <Text style={GlobalStyles.modalDetailInfo}>
                            {selectedEvent.fromTime
                              ? selectedEvent.fromTime
                              : ""}
                            {selectedEvent.toTime
                              ? ` ~ ${selectedEvent.toTime}`
                              : ""}
                          </Text>
                        </View>
                      )}
                      {selectedEvent.telephone && (
                        <View style={{ gap: 4 }}>
                          <View style={GlobalStyles.modalDetailRow}>
                            <Ionicons
                              name="call-outline"
                              size={18}
                              color={mainColor}
                            />
                            <Text style={GlobalStyles.modalDetailInfo}>
                              {selectedEvent.telephone}
                            </Text>
                          </View>
                          {(selectedEvent.telephoneFromTime ||
                            selectedEvent.telephoneToTime) && (
                            <View
                              style={[
                                GlobalStyles.modalDetailRow,
                                { paddingLeft: 28 },
                              ]}
                            >
                              <Text
                                style={[
                                  GlobalStyles.modalDetailInfo,
                                  { color: "#8e8e93", fontSize: 13 },
                                ]}
                              >
                                Hours: {selectedEvent.telephoneFromTime || ""} ~{" "}
                                {selectedEvent.telephoneToTime || ""}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  {selectedEvent.url && (
                    <TouchableOpacity
                      style={GlobalStyles.urlButton}
                      activeOpacity={0.8}
                      onPress={() => handleOpenURL(selectedEvent.url)}
                    >
                      <Text style={GlobalStyles.urlButtonText}>
                        View Website
                      </Text>
                      <Ionicons name="open-outline" size={18} color="#000" />
                    </TouchableOpacity>
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
