import { ContextProvider } from "@/src/providers/contextModule";
import SmartProvider from "@/src/providers/smartProvider";
import {
  Exo2_400Regular,
  Exo2_700Bold,
  useFonts,
} from "@expo-google-fonts/exo-2";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "react-native-reanimated";
import "../core/error";
import '../core/polyfills';
import ContextLoader from "../providers/contextLoader";

export default function RootLayout() {
  useFonts({
    Exo2_400Regular,
    Exo2_700Bold,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <React.Fragment>
        {
          // This provider put a phone frame around the app if the app is running on a desktop
        }
        <SmartProvider>
          {
            // This provider provides the context to the app
          }
          <ContextProvider>
            {
              // This provider provides metamask connectivity
            }
            <ContextLoader />
            {
              // Base App Analytics
            }
            <Stack
              initialRouteName="index"
              screenOptions={{
                animation: "simple_push",
                headerShown: false,
                contentStyle: { backgroundColor: "black" },
              }}
            >
              {
                // Splash Loading Screen
              }
              <Stack.Screen name="index" />
              {
                // Setup Screen
              }
              <Stack.Screen name="(screens)/create" />
              {
                // Main Screen
              }
              <Stack.Screen name="(screens)/main" />
              {
                // Receive Screen
              }
              <Stack.Screen name="(screens)/receive" />
              {
                // Setup Charge
              }
              <Stack.Screen name="(screens)/charge" />
              {
                <Stack.Screen name="(screens)/claimnft" />
              }
              {
                // Receipt Screen
              }
              <Stack.Screen name="receipt" />
              {
                // Cards Screen
              }
              <Stack.Screen name="(screens)/cards" />
              {
                // Legal Screens
              }
              <Stack.Screen name="terms" />
              <Stack.Screen name="privacy" />
              <Stack.Screen name="(screens)/pincode" />
              {

                // Error Screen
              }

              <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
            </Stack>
            <StatusBar style="auto" />
          </ContextProvider>
        </SmartProvider>
      </React.Fragment>
    </GestureHandlerRootView>
  );
}
