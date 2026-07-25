"use client";

import { Browser } from "@capacitor/browser";
import { isNativePlatform } from "./is-native";

/**
 * Opens an OAuth/SSO URL in an in-app browser sheet (Chrome Custom Tabs on
 * Android, SFSafariViewController on iOS) instead of the main WebView.
 *
 * Google sign-in on Capacitor is browser-free via `startNativeGoogleAuth`
 * (OS account sheet + ID token). Keep this helper for any other redirect-based
 * SSO that still needs a system browser sheet.
 *
 * On plain web this navigates the current window (Clerk's default behavior).
 */
export async function openAuthUrl(url: string) {
  if (!isNativePlatform()) {
    window.location.href = url;
    return;
  }

  await Browser.open({ url, presentationStyle: "popover" });
}
