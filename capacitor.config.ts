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
        },
      }
    : {}),
};

export default config;
