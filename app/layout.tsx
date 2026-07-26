import type { Metadata, Viewport } from "next";
import { auth } from "@clerk/nextjs/server";
import { Atkinson_Hyperlegible, Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";

import { GalzuClerkProvider } from "@/components/clerk/galzu-clerk-provider";
import { AppHeader } from "@/components/layout/app-header";
import { CapacitorAuthBridge } from "@/components/mobile/capacitor-auth-bridge";
import { RevenueCatInitializer } from "@/components/mobile/revenuecat-initializer";
import { LearnerPrefsProvider } from "@/components/preferences/learner-prefs-provider";
import { getUserProfile } from "@/lib/db/index";
import {
  DEFAULT_FONT_STYLE,
  DEFAULT_PREFERRED_LANGUAGE,
  fontStyleMeta,
  languageMeta,
} from "@/lib/preferences/language-font";
import { normalizeUserProfileRow } from "@/lib/user-profile-normalize";

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

async function loadLearnerChrome() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        language: DEFAULT_PREFERRED_LANGUAGE,
        fontStyle: DEFAULT_FONT_STYLE,
      };
    }
    const profile = await getUserProfile(userId);
    const normalized = normalizeUserProfileRow(profile);
    return {
      language: normalized.preferred_language,
      fontStyle: normalized.font_style,
    };
  } catch {
    return {
      language: DEFAULT_PREFERRED_LANGUAGE,
      fontStyle: DEFAULT_FONT_STYLE,
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { language, fontStyle } = await loadLearnerChrome();
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
            <CapacitorAuthBridge />
            <RevenueCatInitializer />
            <AppHeader />
            {children}
          </LearnerPrefsProvider>
        </GalzuClerkProvider>
      </body>
    </html>
  );
}
