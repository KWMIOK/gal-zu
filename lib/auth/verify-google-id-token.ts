/**
 * Verifies a Google ID token (Capgo / Credential Manager) against Google's
 * tokeninfo endpoint. Used by the native sign-in Server Action so we never
 * trust an unverified JWT from the device.
 */

export type VerifiedGoogleIdToken = {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  fullName?: string;
  pictureUrl?: string;
  /** JWT `aud` — must be the Web OAuth client ID. */
  audience: string;
  /** JWT `azp` — often the Android/iOS client ID when minted natively. */
  authorizedParty?: string;
};

type GoogleTokenInfo = {
  iss?: string;
  aud?: string;
  azp?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
};

function isGoogleIssuer(iss: string | undefined): boolean {
  return (
    iss === "https://accounts.google.com" || iss === "accounts.google.com"
  );
}

export async function verifyGoogleIdToken(
  idToken: string,
  expectedWebClientId: string,
): Promise<VerifiedGoogleIdToken> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { cache: "no-store" },
  );

  const payload = (await res.json()) as GoogleTokenInfo;

  if (!res.ok || payload.error) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Google rejected the ID token.",
    );
  }

  if (!isGoogleIssuer(payload.iss)) {
    throw new Error("Google ID token has an unexpected issuer.");
  }

  if (!payload.aud || payload.aud !== expectedWebClientId) {
    throw new Error(
      `Google ID token audience mismatch. Token aud=${payload.aud ?? "(missing)"}; ` +
        `expected Web Client ID=${expectedWebClientId}. Capgo must be initialized ` +
        `with the same Web OAuth client ID configured in Clerk.`,
    );
  }

  if (!payload.sub) {
    throw new Error("Google ID token is missing subject (sub).");
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email) {
    throw new Error(
      "Google ID token has no email. Ensure the Google Cloud OAuth client " +
        "requests the email scope (default for Capgo without custom scopes).",
    );
  }

  const emailVerified =
    payload.email_verified === true || payload.email_verified === "true";

  if (!emailVerified) {
    throw new Error("Google email is not verified for this account.");
  }

  return {
    sub: payload.sub,
    email,
    emailVerified,
    givenName: payload.given_name,
    familyName: payload.family_name,
    fullName: payload.name,
    pictureUrl: payload.picture,
    audience: payload.aud,
    authorizedParty: payload.azp,
  };
}
