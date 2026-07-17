"use client";

import { Browser } from "@capacitor/browser";
import { isNativePlatform } from "./is-native";

/**
 * Opens an OAuth/SSO URL (e.g. Clerk's Google/GitHub `authenticateWithRedirect`
 * target) in the system browser instead of the app's own WebView.
 *
 * This matters because Google (and several other providers) actively block
 * OAuth consent screens loaded inside an embedded WebView user-agent
 * ("disallowed_useragent"), which is exactly what Capacitor's main WebView
 * looks like. Routing through the system browser (Chrome Custom Tabs on
 * Android, SFSafariViewController on iOS) avoids that block entirely.
 *
 * The provider is configured (via Clerk's `redirectUrl`) to send the user
 * back to `com.galzu.app://sso-callback`, a custom URL scheme registered in
 * `AndroidManifest.xml` / `Info.plist`. `CapacitorAuthBridge` listens for
 * that deep link and hands the callback back to the in-app WebView so
 * Clerk's `AuthenticateWithRedirectCallback` component can finish the sign-in.
 *
 * On plain web this is a no-op passthrough — the browser just navigates
 * normally, matching Clerk's default behavior.
 */
export async function openAuthUrl(url: string) {
  if (!isNativePlatform()) {
    window.location.href = url;
    return;
  }

  await Browser.open({ url, presentationStyle: "popover" });
}
