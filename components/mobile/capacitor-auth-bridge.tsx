"use client";

import { useEffect } from "react";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isNativePlatform } from "@/lib/capacitor/is-native";

const DEEP_LINK_SCHEME = "com.galzu.app://";

/**
 * Mounted once near the root of the app. On native (Android/iOS) it listens
 * for the `com.galzu.app://...` deep link that the system browser opens once
 * an OAuth provider (Google, GitHub, etc.) finishes sign-in outside the app's
 * WebView, closes that system browser tab, and forwards the callback path +
 * query params into *this* WebView so Clerk's `AuthenticateWithRedirectCallback`
 * (rendered on `/sso-callback`) can complete the session using this WebView's
 * own session/cookie context.
 *
 * No-op on web — regular browser OAuth redirects never touch this code path.
 */
export function CapacitorAuthBridge() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    const listenerPromise = App.addListener(
      "appUrlOpen",
      (event: URLOpenListenerEvent) => {
        if (!event.url.startsWith(DEEP_LINK_SCHEME)) return;

        const suffix = event.url.slice(DEEP_LINK_SCHEME.length);
        const targetPath = suffix.startsWith("sso-callback")
          ? suffix
          : `sso-callback?${suffix}`;

        void Browser.close().catch(() => {
          /* system browser may already be closed by the OS — ignore */
        });

        window.location.href = `${window.location.origin}/${targetPath}`;
      },
    );

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
