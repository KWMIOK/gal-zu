"use client";

import { useEffect } from "react";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

import { isNativePlatform } from "@/lib/capacitor/is-native";
import { isNativeOAuthInFlight } from "@/lib/capacitor/native-oauth";

const DEEP_LINK_SCHEME = "com.galzu.app://";

/**
 * Cold-start fallback for OAuth deep links (e.g. leftover Custom-Tabs flows
 * or non-Google SSO). Google sign-in is fully native now
 * (`startNativeGoogleAuth`) and does not use this path. When the app is
 * opened via `com.galzu.app://sso-callback…`, close any in-app browser tab
 * and hand the callback to `/sso-callback` so Clerk can finish the session.
 */
export function CapacitorAuthBridge() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    const listenerPromise = App.addListener(
      "appUrlOpen",
      (event: URLOpenListenerEvent) => {
        if (!event.url.startsWith(DEEP_LINK_SCHEME)) return;
        if (isNativeOAuthInFlight()) return;

        // Custom schemes parse as host+path oddly in URL(); slice the scheme.
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
