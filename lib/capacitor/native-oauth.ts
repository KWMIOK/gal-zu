"use client";

import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import type { useClerk } from "@clerk/nextjs";

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

type ClerkClient = ReturnType<typeof useClerk>;

export type StartNativeGoogleAuthParams = {
  clerk: ClerkClient;
  /** Where to send the user after a completed session (app-owned navigation). */
  afterSignInUrl: string;
  afterSignUpUrl: string;
};

let googleInitialized = false;

function getGoogleWebClientId(): string {
  const id = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!id) {
    throw new Error(
      "Missing NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID. Use the Google Cloud " +
        "*Web application* OAuth client ID (same project as your Android/iOS " +
        "clients — must match Clerk → SSO → Google custom credentials).",
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

function clerkErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") {
    return err instanceof Error ? err.message : "Google sign-in failed.";
  }

  const errors =
    "errors" in err && Array.isArray(err.errors) ? err.errors : null;
  const first = errors?.[0] as
    | { longMessage?: string; message?: string; code?: string }
    | undefined;
  const raw =
    first?.longMessage ||
    first?.message ||
    ("message" in err && typeof err.message === "string" ? err.message : null) ||
    "Google sign-in failed.";

  const code = first?.code ?? "";
  if (
    code === "authorization_invalid" ||
    /not authorized to perform this request/i.test(raw)
  ) {
    return (
      `${raw} Check Clerk Dashboard → SSO → Google: use *custom* credentials ` +
      `whose Web Client ID exactly matches NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ` +
      `(the same Web OAuth client Capgo uses for the ID token).`
    );
  }
  if (code === "google_one_tap_token_invalid") {
    return (
      `${raw} The Google ID token audience must be your Web Client ID, and ` +
      `that same ID must be configured in Clerk's Google SSO custom credentials.`
    );
  }
  return raw;
}

async function ensureGoogleInitialized(): Promise<void> {
  if (googleInitialized) return;

  const webClientId = getGoogleWebClientId();
  const iOSClientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  await SocialLogin.initialize({
    google: {
      webClientId,
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
 * 1. OS account sheet via Capgo SocialLogin (never Chrome)
 * 2. Exchange ID token with Clerk via `authenticateWithGoogleOneTap`
 *    (not `signIn.create({ strategy: "google_one_tap" })` — that path returns
 *    authorization_invalid for many existing accounts)
 * 3. Activate the session / finish any remaining One Tap callback steps
 */
export async function startNativeGoogleAuth({
  clerk,
  afterSignInUrl,
  afterSignUpUrl,
}: StartNativeGoogleAuthParams): Promise<{ createdSessionId: string | null }> {
  if (!isNativePlatform()) {
    throw new Error("startNativeGoogleAuth is only for the Capacitor shell.");
  }

  if (!clerk.authenticateWithGoogleOneTap || !clerk.setActive) {
    throw new Error("Clerk is not ready for Google One Tap authentication.");
  }

  await ensureGoogleInitialized();

  let idToken: string | null = null;
  try {
    const result = await SocialLogin.login({
      provider: "google",
      options: {
        style: Capacitor.getPlatform() === "android" ? "bottom" : "standard",
        filterByAuthorizedAccounts: false,
        forcePrompt: true,
        // Do NOT pass `scopes` — Capgo requires a modified MainActivity for that.
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

  try {
    const signInOrUp = await clerk.authenticateWithGoogleOneTap({
      token: idToken,
    });

    if (signInOrUp.status === "complete" && signInOrUp.createdSessionId) {
      await clerk.setActive({ session: signInOrUp.createdSessionId });
      return { createdSessionId: signInOrUp.createdSessionId };
    }

    // Incomplete flows (e.g. missing fields) — let Clerk finish + navigate.
    if (clerk.handleGoogleOneTapCallback) {
      await clerk.handleGoogleOneTapCallback(signInOrUp, {
        signInForceRedirectUrl: afterSignInUrl,
        signUpForceRedirectUrl: afterSignUpUrl,
        signInFallbackRedirectUrl: afterSignInUrl,
        signUpFallbackRedirectUrl: afterSignUpUrl,
      });
      return {
        createdSessionId: signInOrUp.createdSessionId ?? null,
      };
    }

    throw new Error(
      "Google sign-in did not complete. Try again or finish any required steps.",
    );
  } catch (err) {
    throw new Error(clerkErrorMessage(err));
  }
}

/** @deprecated Use `startNativeGoogleAuth` — kept as an alias for call sites. */
export const startNativeOAuth = startNativeGoogleAuth;
