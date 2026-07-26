"use client";

import { Browser } from "@capacitor/browser";

import { isNativePlatform } from "./is-native";

function isGoogleOAuthUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "accounts.google.com" ||
      host.endsWith(".google.com") ||
      host.includes("googleusercontent.com")
    );
  } catch {
    const lower = url.toLowerCase();
    return (
      lower.includes("accounts.google.com") ||
      lower.includes("google.com/o/oauth") ||
      lower.includes("googleapis.com/auth")
    );
  }
}

/**
 * Opens an OAuth/SSO URL in an in-app browser sheet (Chrome Custom Tabs on
 * Android, SFSafariViewController on iOS) instead of the main WebView.
 *
 * Google sign-in on Capacitor is browser-free via `startNativeGoogleAuth`
 * (OS account sheet + ID token). This helper **refuses** Google OAuth URLs
 * on native so a future regression cannot silently reopen Chrome.
 *
 * On plain web this navigates the current window (Clerk's default behavior).
 */
export async function openAuthUrl(url: string) {
  if (!isNativePlatform()) {
    window.location.href = url;
    return;
  }

  if (isGoogleOAuthUrl(url)) {
    throw new Error(
      "Browser Google OAuth is banned on Capacitor. Use startNativeGoogleAuth " +
        "(OS account sheet + Clerk google_one_tap) — see AGENTS.md / SignUpCta.",
    );
  }

  await Browser.open({ url, presentationStyle: "popover" });
}
