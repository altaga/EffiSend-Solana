import { Linking, Platform } from "react-native";

// --- CONFIG VARIABLES ---
export const GATE_TEXT_COLOR = "#333333";
export const GATE_MARKER_COLOR = "#333333";
export const GATE_CLUSTER_COLOR = "#57606F";
export const GATE_MIN_ZOOM = 16;

export const AREA_CONFIG = {
  1: { name: "LaQua", color: "#FF4757" },
  2: { name: "Yellow Building", color: "#EABF00" },
  3: { name: "Attractions Area", color: "#2ED573" },
  4: { name: "Meets Port", color: "#1E90FF" },
  5: { name: "Korakuen Hall", color: "#A55EEA" },
  6: { name: "IMM Theater", color: "#FD9644" },
  7: { name: "Blueing", color: "#00CEC9" },
  8: { name: "Tokyo Dome Hotel", color: "#d71a46" },
  9: { name: "Shonen Jump", color: "#FF0000" },
  10: { name: "Helper Area", color: "#0044ff" },
};

export const CATEGORY_EMOJIS = {
  spa: "🧖‍♀️",
  shop: "🛍️",
  food: "🍴",
  attraction: "🎡",
  facility: "ℹ️",
  activity: "⚡",
  hotel: "🏨",
  dining: "🍽️",
  shopping: "🛒",
  helper: "🆘",
  gate: "🚪",
  default: "📍",
};

export const TOKYO_DOME_CITY_COLOR = "#374582";
export const OTHER_COLOR = "#CED6E0";

export const CLUSTER_LABEL_SIZE = 12;
export const AMENITY_LABEL_SIZE = 12;

// --- UTILS ---
export const openInExternalMap = (lat, lng, name) => {
  const encodedName = encodeURIComponent(name);
  const url = Platform.select({
    ios: `maps://0,0?q=${encodedName}@${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}(${encodedName})`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  });
  Linking.openURL(url).catch((err) => console.error("Couldn't load map", err));
};

export const getAreaId = (name) => {
  const entry = Object.entries(AREA_CONFIG).find(([, val]) => val.name === name);
  return entry ? parseInt(entry[0]) : 99;
};

export const mixColors = (c1, c2) => {
  const process = (hex) => parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [16, 8, 0].map(shift => Math.round((((process(c1) >> shift) & 255) + ((process(c2) >> shift) & 255)) / 2).toString(16).padStart(2, "0"));
  return `#${r}${g}${b}`;
};

export const formatAmenityList = (names) => {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
};