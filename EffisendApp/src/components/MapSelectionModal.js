import React from "react";
import { Linking, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { AREA_CONFIG, CATEGORY_EMOJIS, GATE_MARKER_COLOR, OTHER_COLOR, openInExternalMap } from "./mapUtils";

export function MapSelectionModal({ selectedPlaces, focusedPlace, setFocusedPlace, handleClose, styles }) {
  if (selectedPlaces.length === 0) return null;

  const handleOpenLink = (url) => {
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {!focusedPlace && (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>
                Select Location ({selectedPlaces.length})
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 200 }}>
              {selectedPlaces.map((place, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.listItem}
                  onPress={() => setFocusedPlace(place)}
                >
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          place.category === "gate"
                            ? GATE_MARKER_COLOR
                            : AREA_CONFIG[place.areaId]?.color || OTHER_COLOR,
                      },
                    ]}
                  />
                  <Text style={{ fontSize: 16, marginRight: 8 }}>
                    {CATEGORY_EMOJIS[place.category] || CATEGORY_EMOJIS.default}
                  </Text>
                  <Text style={styles.listItemText}>{place.name}</Text>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
        {focusedPlace && (
          <>
            <View style={styles.header}>
              {selectedPlaces.length > 1 && (
                <TouchableOpacity
                  onPress={() => setFocusedPlace(null)}
                  style={{ marginRight: 10 }}
                >
                  <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  {focusedPlace.category && (
                    <Text style={{ fontSize: 18 }}>
                      {CATEGORY_EMOJIS[focusedPlace.category] ||
                        CATEGORY_EMOJIS.default}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.areaBadge,
                      {
                        color:
                          focusedPlace.category === "gate"
                            ? GATE_MARKER_COLOR
                            : AREA_CONFIG[focusedPlace.areaId]?.color || "#333",
                        marginBottom: 0,
                      },
                    ]}
                  >
                    {focusedPlace.area}
                  </Text>
                </View>
                <Text style={styles.title} numberOfLines={1}>
                  {focusedPlace.name}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 250, marginTop: 10 }}>
              <Text style={styles.desc}>
                {focusedPlace.detailed_description}
              </Text>
              {focusedPlace.floor && focusedPlace.floor.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Floor:</Text>
                  <Text style={styles.value}>
                    {focusedPlace.floor.join(", ")}
                  </Text>
                </View>
              )}
              {focusedPlace.opening_hours && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Hours:</Text>
                  <Text style={styles.value}>
                    {focusedPlace.opening_hours} - {focusedPlace.closing_hours}
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: "#57606F" }]}
                onPress={() => openInExternalMap(focusedPlace.lat, focusedPlace.lng, focusedPlace.name)}
              >
                <Text style={styles.btnText}>Open in Maps</Text>
              </TouchableOpacity>
              {focusedPlace.url && focusedPlace.url !== "NA" && (
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => handleOpenLink(focusedPlace.url)}
                >
                  <Text style={styles.btnText}>Website</Text>
                </TouchableOpacity>
              )}
              {focusedPlace.tickets && focusedPlace.tickets !== "NA" && (
                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: "#EABF00" }]}
                  onPress={() => handleOpenLink(focusedPlace.tickets)}
                >
                  <Text style={[styles.btnText, { color: "#333" }]}>Tickets</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}