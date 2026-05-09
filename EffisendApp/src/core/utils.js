import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FallbackProvider,
  JsonRpcProvider,
  formatUnits,
  randomBytes,
  uuidV4,
} from "ethers";
import * as EncryptedStorage from "expo-secure-store";
import { fetch } from "expo/fetch";
import { Dimensions, PixelRatio, Platform } from "react-native";

export const decodeBase64 = (str) => {
  try {
    // 1. Check for native atob (Available in modern Hermes/React Native)
    if (typeof atob !== "undefined") {
      return atob(str);
    }

    // 2. Manual Fallback (Vanilla JS implementation)
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    let stringToDecode = String(str).replace(/[=]+$/, "");

    for (
      let bc = 0, bs = 0, buffer, idx = 0;
      (buffer = stringToDecode.charAt(idx++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  } catch (error) {
    console.error("Utils: decodeBase64 error:", error);
    return "";
  }
};

export async function getOrSetPostHogId() {
  let distinctId = await getAsyncStorageValue("distinctId");
  if (!distinctId) {
    const bytes = randomBytes(16);
    distinctId = `posthog_${uuidV4(bytes)}`;
    await setAsyncStorageValue({ distinctId });
  }
  return distinctId;
}

export async function postHogEvent(event, properties = {}) {
  const window = Dimensions.get("window");
  const ratio = window.height / window.width;
  const isWebMobileView = Platform.OS === "web" && ratio > 1;
  const myHeaders = new Headers();
  const distinctId = await getOrSetPostHogId();
  myHeaders.append("Content-Type", "application/json");
  const raw = JSON.stringify({
    event,
    properties: {
      ...properties,
      device: isWebMobileView ? "mobile" : "web",
      distinct_id: distinctId,
    },
    timestamp: new Date().toISOString(),
  });
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };
  return new Promise((resolve) => {
    fetch(`/api/postHogEvent`, requestOptions)
      .then((response) => response.json())
      .then((result) => resolve(result))
      .catch(() => resolve(null));
  });
}

export async function fetchWithRetries(url, options = {}, retryOptions = {}) {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    timeout = 15000,
  } = retryOptions;
  let currentDelay = delay;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal ?? controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        if (response.status < 500 && response.status !== 429) {
          throw new Error(`Non-retriable error: ${response.status}`);
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Request aborted or timed out`);
      }
      if (attempt === retries) {
        throw new Error(`Failed after ${retries} attempts: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoff;
    }
  }
}

export async function getAsyncStorageValue(label) {
  try {
    const session = await AsyncStorage.getItem("General");
    if (label in JSON.parse(session)) {
      return JSON.parse(session)[label];
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

export async function setAsyncStorageValue(value) {
  const session = await AsyncStorage.getItem("General");
  await AsyncStorage.setItem(
    "General",
    JSON.stringify({
      ...JSON.parse(session),
      ...value,
    }),
  );
}

export async function getEncryptedStorageValue(label) {
  try {
    const session = await EncryptedStorage.getItem("General");
    if (label in JSON.parse(session)) {
      return JSON.parse(session)[label];
    } else {
      return null;
    }
  } catch {
    try {
      const session = await AsyncStorage.getItem("GeneralBackup");
      if (label in JSON.parse(session)) {
        return JSON.parse(session)[label];
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }
}

export async function setEncryptedStorageValue(value) {
  try {
    const session = await EncryptedStorage.getItem("General");
    await EncryptedStorage.setItem(
      "General",
      JSON.stringify({
        ...JSON.parse(session),
        ...value,
      }),
    );
  } catch {
    const session = await AsyncStorage.getItem("GeneralBackup");
    await AsyncStorage.setItem(
      "GeneralBackup",
      JSON.stringify({
        ...JSON.parse(session),
        ...value,
      }),
    );
  }
}

export async function nukeStorage() {
  try {
    await AsyncStorage.clear();
    await clearSecureStorage();
  } catch {
    
  }
}

export async function clearSecureStorage() {
  try {
    await EncryptedStorage.deleteItemAsync("General");
  } catch {
    
  }
}

export function isValidUUID(uuid) {
  const regex =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  return regex.test(uuid);
}

export function arraySum(array) {
  return array.reduce((accumulator, currentValue) => {
    return accumulator + currentValue;
  }, 0);
}

export function epsilonRound(num, zeros = 4) {
  let temp = num;
  if (typeof num === "string") {
    temp = parseFloat(num);
  }
  return (
    Math.round((temp + Number.EPSILON) * Math.pow(10, zeros)) /
    Math.pow(10, zeros)
  );
}

export function findIndexByProperty(array, property, value) {
  for (let i = 0; i < array.length; i++) {
    if (array[i][property] === value) {
      return i;
    }
  }
  return -1; // If not found
}

export function removeDuplicatesByKey(arr, key) {
  const seen = new Set();

  return arr
    .slice()
    .reverse() // Reverse the array
    .filter((item) => {
      if (seen.has(item[key])) {
        return false; // Skip if the value has already been seen
      }
      seen.add(item[key]);
      return true; // Keep the item if it's the first time the value is encountered
    })
    .reverse(); // Reverse it back to original order
}

export function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function setTokens(array) {
  return array.map((item, index) => {
    return {
      ...item,
      index,
      value: index.toString(),
      label: item.symbol,
      key: item.symbol,
    };
  });
}

export function setChains(array) {
  return array.map((item, index) => {
    return {
      ...item,
      color: "white",
      index,
      value: index.toString(),
      label: item.network,
      key: item.iconSymbol,
    };
  });
}

export function setupProvider(rpcs, chainId) {
  const providers = rpcs.map((rpc) => {
    if (chainId) {
      return new JsonRpcProvider(rpc, { chainId: Number(chainId), name: "unknown" }, { staticNetwork: true });
    }
    return new JsonRpcProvider(rpc);
  });
  return new FallbackProvider(
    providers.map((provider, i) => {
      return {
        provider,
        priority: i,
        weight: 1,
        stallTimeout: 2000,
      };
    }),
  );
}

export const normalizeFontSize = (size) => {
  let { width, height } = Dimensions.get("window");
  if (Platform.OS === "web" && height / width < 1) {
    width /= 2.3179;
    height *= 0.972;
  }
  const scale = width / 375;
  const factor = 0.4;
  const moderateScale = 1 + (scale - 1) * factor;
  // Clamp the scale between 0.85 (min) and 1.2 (max) to prevent overlapping layouts
  const clampedScale = Math.max(0.85, Math.min(1.2, moderateScale));
  return PixelRatio.roundToNearestPixel(size * clampedScale);
};

export function verifyWallet(hexString) {
  try {
    const publicKey = hexString;
    return publicKey.length === 42;
  } catch (_e) {
    return false;
  }
}

export function formatInputText(inputText, decimalPlaces = 2) {
  // Remove non-numeric characters except for decimal point
  const cleanedText = inputText.replace(/[^0-9\.]/g, "");

  // Handle empty or invalid input
  if (!cleanedText || cleanedText === ".") {
    return "0.00";
  }

  // Split the input into integer and fractional parts
  const parts = cleanedText.split(".");

  // Handle integer part
  let integerPart = parts[0];
  if (integerPart === "") {
    integerPart = "0";
  }

  // Handle fractional part
  let fractionalPart = parts[1];
  if (!fractionalPart) {
    fractionalPart = "0".repeat(decimalPlaces);
  } else if (fractionalPart.length > decimalPlaces) {
    fractionalPart = fractionalPart.substring(0, decimalPlaces);
  } else {
    fractionalPart = fractionalPart.padEnd(decimalPlaces, "0");
  }

  // Combine the integer and fractional parts
  return `${integerPart}.${fractionalPart}`;
}

export function deleteLeadingZeros(string) {
  let number = parseFloat(string);
  let formattedString = number.toFixed(2).toString();
  return formattedString;
}

export function rgbaToHex(r, g, b, alphaPercent) {
  const toHex = (n) => n.toString(16).padStart(2, "0");

  // Clamp alpha to [0, 100], then convert to [0, 255]
  const a = Math.round((Math.max(0, Math.min(100, alphaPercent)) * 255) / 100);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
}

export function formatTimestamp(unixTimestamp) {
  const now = new Date();
  const messageDate = new Date(unixTimestamp * 1000); // Convert from seconds to milliseconds

  const diffMs = now - messageDate;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";

  // Return formatted date (e.g. 03/Jul or 03/Jul/2025 if not same year)
  const day = messageDate.getDate();
  const month = messageDate.toLocaleString("default", { month: "short" });
  const year = messageDate.getFullYear();

  const showYear = year !== now.getFullYear();
  return `${day}/${month}${showYear ? "/" + year : ""}`;
}

export const safeFormatUnits = (value, decimals) => {
  try {
    if (value === undefined || value === null) return "0";
    return formatUnits(BigInt(value), decimals);
  } catch (_e) {
    console.warn("Error formatting units:", _e);
    return "0";
  }
};
export const getContrastColor = (hexColor) => {
  if (!hexColor) return "#FFFFFF";

  // Remove the hash if it exists
  const color = hexColor.replace("#", "");

  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Calculate luminance (SDR)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? "#000000" : "#FFFFFF"; // Adjusted threshold for better UI contrast
};

/**
 * Checks if a string is a valid 32-byte Solana address.
 * @param {string} address - The Base58 encoded address string.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function isValidSolanaAddress(address) {
  // 1. Check length constraint (32 to 44 characters)
  if (!address || address.length < 32 || address.length > 44) return false;

  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const ALPHABET_MAP = {};
  for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET[i]] = i;

  // 2. Base58 decoding logic
  let bytes = [0];
  for (let i = 0; i < address.length; i++) {
    let c = address[i];
    if (!(c in ALPHABET_MAP)) return false; // Contains non-base58 characters

    for (let j = 0; j < bytes.length; j++) bytes[j] *= 58;
    bytes[0] += ALPHABET_MAP[c];

    let carry = 0;
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] += carry;
      carry = bytes[j] >> 8;
      bytes[j] &= 0xff;
    }

    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // 3. Handle leading zeros (represented as '1' in Base58)
  for (let i = 0; address[i] === "1" && i < address.length - 1; i++) {
    bytes.push(0);
  }

  // 4. Verify decoded byte length is exactly 32
  return bytes.length === 32;
}
