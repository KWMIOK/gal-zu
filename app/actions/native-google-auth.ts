"use server";

import { clerkClient } from "@clerk/nextjs/server";

import { verifyGoogleIdToken } from "@/lib/auth/verify-google-id-token";

export type ExchangeGoogleIdTokenResult =
  | { ok: true; ticket: string }
  | { ok: false; error: string };

/**
 * Capgo returns a Google ID token; Clerk's browser One Tap exchange
 * (`authenticateWithGoogleOneTap`) returns `authorization_invalid` in the
 * Capacitor WebView even when Client IDs match. Instead we verify the token
 * server-side and mint a short-lived Clerk sign-in ticket the client consumes
 * with `strategy: "ticket"`.
 */
export async function exchangeGoogleIdTokenForClerkTicket(
  idToken: string,
): Promise<ExchangeGoogleIdTokenResult> {
  const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set on the server. Add it to Vercel env and redeploy.",
    };
  }

  if (!idToken || typeof idToken !== "string" || idToken.length < 40) {
    return { ok: false, error: "Missing Google ID token." };
  }

  try {
    const google = await verifyGoogleIdToken(idToken, webClientId);
    const client = await clerkClient();

    const existing = await client.users.getUserList({
      emailAddress: [google.email],
      limit: 1,
    });

    let userId = existing.data[0]?.id;

    if (!userId) {
      const created = await client.users.createUser({
        emailAddress: [google.email],
        externalId: `google:${google.sub}`,
        firstName: google.givenName,
        lastName: google.familyName,
        skipPasswordChecks: true,
        skipPasswordRequirement: true,
        ...(google.pictureUrl
          ? { publicMetadata: { googlePictureUrl: google.pictureUrl } }
          : {}),
      });
      userId = created.id;
    }

    const signInToken = await client.signInTokens.createSignInToken({
      userId,
      expiresInSeconds: 120,
    });

    return { ok: true, ticket: signInToken.token };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to exchange Google token.";
    // Clerk duplicate externalId / email races → clearer message
    if (/external.?id|already.?exists|taken|duplicate/i.test(message)) {
      try {
        const google = await verifyGoogleIdToken(idToken, webClientId);
        const client = await clerkClient();
        const byEmail = await client.users.getUserList({
          emailAddress: [google.email],
          limit: 1,
        });
        const userId = byEmail.data[0]?.id;
        if (userId) {
          const signInToken = await client.signInTokens.createSignInToken({
            userId,
            expiresInSeconds: 120,
          });
          return { ok: true, ticket: signInToken.token };
        }
      } catch {
        // fall through
      }
    }
    return { ok: false, error: message };
  }
}
