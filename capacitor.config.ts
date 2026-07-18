import { readFileSync } from "fs";
import { join } from "path";
import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Gal-zu runs on Server Actions, Server Components with Clerk `auth()`,
 * and `clerkMiddleware` — all of which require a live Node.js server.
 * A classic `output: 'export'` static bundle cannot run any of that.
 *
 * Instead, the native shell loads the deployed Next.js app directly
 * (Capacitor's supported "hosted app" pattern). Everything server-side
 * — auth, RLS-backed Supabase reads/writes, Gemini generation — keeps
 * running exactly as it does on the web, unchanged.
 *
 * Set MOBILE_APP_URL to your deployed origin before every mobile build:
 *   MOBILE_APP_URL=https://gal-zu.vercel.app npm run build:mobile
 */
const remoteUrl = process.env.MOBILE_APP_URL;

/**
 * Clerk performs a top-level "handshake" redirect through its own hosted
 * domain (`<instance>.clerk.accounts.dev`, or a custom domain on paid
 * plans) on first load to establish session cookies — WebViews can't be
 * trusted to persist third-party cookies the way a full browser can.
 *
 * If that domain isn't explicitly allowed, Capacitor's Android WebView
 * hands the *entire* navigation off to the system browser (Chrome) instead
 * of loading it inside the app — which looks exactly like "the app opens
 * in the browser". Decoding it from the publishable key (rather than
 * hardcoding it) keeps this correct if the Clerk instance ever changes.
 */
function getClerkFrontendApiHost(): string | undefined {
  try {
    const envFile = readFileSync(join(__dirname, ".env.local"), "utf8");
    const match = envFile.match(
      /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\s*=\s*(\S+)/,
    );
    const key = match?.[1]?.trim();
    const encoded = key?.split("_")[2];
    if (!encoded) return undefined;

    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    return decoded.replace(/\$$/, "");
  } catch {
    return undefined;
  }
}

const clerkFrontendApiHost = getClerkFrontendApiHost();

const config: CapacitorConfig = {
  appId: "com.galzu.app",
  appName: "Gal-zu",
  webDir: "www",
  ...(remoteUrl
    ? {
        server: {
          url: remoteUrl,
          // Allow http:// only for local dev tunnels (e.g. ngrok/adb reverse).
          // Production URLs should always be https.
          cleartext: remoteUrl.startsWith("http://"),
          androidScheme: "https",
          // Keep Clerk's cookie-handshake redirect (and any other Clerk
          // hosted-domain navigation) inside the app's own WebView instead
          // of kicking the user out to Chrome.
          allowNavigation: [
            ...(clerkFrontendApiHost ? [clerkFrontendApiHost] : []),
            "*.clerk.accounts.dev",
            "*.accounts.dev",
          ],
        },
      }
    : {}),
};

export default config;
