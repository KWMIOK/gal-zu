"use client";

import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import type { SetActive, SignInResource, SignUpResource } from "@clerk/shared/types";

import { isNativePlatform } from "@/lib/capacitor/is-native";

/** Kept for CapacitorAuthBridge cold-start deep links (legacy / other SSO). */
export const NATIVE_SSO_CALLBACK = "com.galzu.app://sso-callback";

/**
 * Legacy flag — native Google no longer uses Custom Tabs, so the auth bridge
 * never races a mid-flight browser OAuth. Always false; retained so the bridge
 * import stays stable.
 */
export function isNativeOAuthInFlight(): boolean {
  return false;
}

export type StartNativeGoogleAuthParams = {
  signIn: SignInResource;
  signUp: SignUpResource;
  setActive: SetActive;
};

let googleInitialized = false;

function getGoogleWebClientId(): string {
  const id = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!id) {
    throw new Error(
      "Missing NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID. Use the Google Cloud " +
        "*Web application* OAuth client ID (same project as your Android/iOS " +
        "clients — usually the Client ID shown under Clerk → SSO → Google).",
    );
  }
  return id;
}

function isUserCancellation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code =
    "code" in err && typeof err.code === "string"
      ? err.code.toUpperCase()
      : "";
  const message =
    "message" in err && typeof err.message === "string"
      ? err.message.toLowerCase()
      : "";
  return (
    code === "USER_CANCELLED" ||
    code.includes("CANCEL") ||
    message.includes("cancel") ||
    message.includes("user denied")
  );
}

async function ensureGoogleInitialized(): Promise<void> {
  if (googleInitialized) return;

  const webClientId = getGoogleWebClientId();
  const iOSClientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  await SocialLogin.initialize({
    google: {
      webClientId,
      // iOS Google Sign-In SDK client; server client must be the Web client ID
      // so the ID token `aud` matches what Clerk verifies.
      ...(iOSClientId ? { iOSClientId } : {}),
      iOSServerClientId: webClientId,
      mode: "online",
    },
  });

  googleInitialized = true;
}

/**
 * Fully browser-free Google sign-in for Capacitor.
 *
 * 1. Android Credential Manager / iOS Google Sign-In presents a system account
 *    sheet (bottom sheet / native popup) — never Custom Tabs or Chrome
 * 2. Exchange the Google ID token with Clerk via `google_one_tap`
 * 3. Activate the resulting session
 *
 * Requires `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Web OAuth client) plus a matching
 * Android OAuth client (package `com.galzu.app` + signing SHA-1) in the same
 * Google Cloud project. Clerk must have Google enabled as an SSO connection.
 */
export async function startNativeGoogleAuth({
  signIn,
  signUp,
  setActive,
}: StartNativeGoogleAuthParams): Promise<{ createdSessionId: string | null }> {
  if (!isNativePlatform()) {
    throw new Error("startNativeGoogleAuth is only for the Capacitor shell.");
  }

  await ensureGoogleInitialized();

  let idToken: string | null = null;
  try {
    const result = await SocialLogin.login({
      provider: "google",
      options: {
        // Android: system account bottom sheet (the in-app "popup").
        style: Capacitor.getPlatform() === "android" ? "bottom" : "standard",
        filterByAuthorizedAccounts: false,
        forcePrompt: true,
        scopes: ["email", "profile"],
      },
    });

    if (result.provider !== "google") {
      throw new Error("Unexpected social login provider response.");
    }

    const payload = result.result;
    if (payload.responseType !== "online" || !payload.idToken) {
      throw new Error("Google did not return an ID token.");
    }
    idToken = payload.idToken;
  } catch (err) {
    if (isUserCancellation(err)) {
      return { createdSessionId: null };
    }
    throw err;
  }

  await signIn.create({
    strategy: "google_one_tap",
    token: idToken,
  });

  if (signIn.firstFactorVerification.status === "transferable") {
    await signUp.create({ transfer: true });
  }

  const createdSessionId =
    signUp.createdSessionId ?? signIn.createdSessionId ?? null;

  if (createdSessionId) {
    await setActive({ session: createdSessionId });
  }

  return { createdSessionId };
}

/** @deprecated Use `startNativeGoogleAuth` — kept as an alias for call sites. */
export const startNativeOAuth = startNativeGoogleAuth;
