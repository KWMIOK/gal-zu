import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Geist_Mono, Inter } from "next/font/google";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";

import { GalzuClerkProvider } from "@/components/clerk/galzu-clerk-provider";
import { AppHeader } from "@/components/layout/app-header";
import { CapacitorAuthBridge } from "@/components/mobile/capacitor-auth-bridge";
import { RevenueCatInitializer } from "@/components/mobile/revenuecat-initializer";
import { LearnerPrefsProvider } from "@/components/preferences/learner-prefs-provider";
import { PreferencesEditProvider } from "@/components/preferences/preferences-edit-context";
import { readLearnerChromeCookies } from "@/lib/preferences/chrome-cookies";
import { fontStyleMeta, languageMeta } from "@/lib/preferences/language-font";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gal-zu | Adaptive AI Learning",
  description:
    "AI-powered adaptive learning with personalized roadmaps, slide decks, and just-in-time lessons.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Cookies only — never block navigation on a Supabase profile round-trip.
  const { language, fontStyle } = await readLearnerChromeCookies();
  const dir = languageMeta(language).dir;
  const cssFamily = fontStyleMeta(fontStyle).cssFamily;

  return (
    <html
      lang={language}
      dir={dir}
      data-font-style={fontStyle}
      style={{ ["--font-learner" as string]: cssFamily }}
      className={`${inter.variable} ${atkinson.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <GalzuClerkProvider>
          <LearnerPrefsProvider language={language} fontStyle={fontStyle}>
            <PreferencesEditProvider>
              <CapacitorAuthBridge />
              <RevenueCatInitializer />
              <AppHeader />
              {children}
            </PreferencesEditProvider>
          </LearnerPrefsProvider>
        </GalzuClerkProvider>
      </body>
    </html>
  );
}
