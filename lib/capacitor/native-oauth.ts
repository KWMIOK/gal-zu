"use client";

import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import type { useClerk } from "@clerk/nextjs";

import { exchangeGoogleIdTokenForClerkTicket } from "@/app/actions/native-google-auth";
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
        "clients). Must also be set on Vercel for the hosted Capacitor app.",
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
  return (
    first?.longMessage ||
    first?.message ||
    ("message" in err && typeof err.message === "string" ? err.message : null) ||
    "Google sign-in failed."
  );
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
 * 2. Server verifies the Google ID token and mints a Clerk sign-in ticket
 *    (avoids `authenticateWithGoogleOneTap`, which returns authorization_invalid
 *    in the Capacitor WebView even when SSO Client IDs match)
 * 3. Client completes with `strategy: "ticket"` and activates the session
 */
export async function startNativeGoogleAuth({
  clerk,
  afterSignInUrl: _afterSignInUrl,
  afterSignUpUrl: _afterSignUpUrl,
}: StartNativeGoogleAuthParams): Promise<{ createdSessionId: string | null }> {
  if (!isNativePlatform()) {
    throw new Error("startNativeGoogleAuth is only for the Capacitor shell.");
  }

  if (!clerk.client?.signIn || !clerk.setActive) {
    throw new Error("Clerk is not ready for native Google authentication.");
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

  const exchange = await exchangeGoogleIdTokenForClerkTicket(idToken);
  if (!exchange.ok) {
    throw new Error(exchange.error);
  }

  try {
    const signInAttempt = await clerk.client.signIn.create({
      strategy: "ticket",
      ticket: exchange.ticket,
    });

    if (signInAttempt.status === "complete" && signInAttempt.createdSessionId) {
      await clerk.setActive({ session: signInAttempt.createdSessionId });
      return { createdSessionId: signInAttempt.createdSessionId };
    }

    throw new Error(
      `Google sign-in did not complete (status: ${signInAttempt.status}).`,
    );
  } catch (err) {
    throw new Error(clerkErrorMessage(err));
  }
}

/** @deprecated Use `startNativeGoogleAuth` — kept as an alias for call sites. */
export const startNativeOAuth = startNativeGoogleAuth;
