import type { NextConfig } from "next";

/**
 * Mobile (Capacitor) notes
 * ------------------------
 * Gal-zu relies on Server Actions (`app/actions/*.ts`), Server Components
 * that call Clerk's `auth()`, and `clerkMiddleware` for route protection —
 * none of which can run in a static export (`output: "export"` produces
 * plain HTML/JS with zero server, so every mutation, RLS-backed Supabase
 * query, and Gemini call in this app would simply break).
 *
 * Because of that, the native Android/iOS shell does NOT bundle a static
 * build. Instead (see `capacitor.config.ts`) it points its WebView at the
 * real deployed Next.js app, so auth/data/AI generation behave identically
 * to the web app. `images.unoptimized` is still set below since the native
 * shell's WebView has no access to Next's on-the-fly image optimizer route
 * unless it's served from the same deployed origin — keeping it off avoids
 * broken images if any static/offline export is ever attempted later.
 */
const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
