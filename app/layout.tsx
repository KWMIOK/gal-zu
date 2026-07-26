import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { GalzuClerkProvider } from "@/components/clerk/galzu-clerk-provider";
import { AppHeader } from "@/components/layout/app-header";
import { CapacitorAuthBridge } from "@/components/mobile/capacitor-auth-bridge";
import { RevenueCatInitializer } from "@/components/mobile/revenuecat-initializer";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  // Advertise both schemes so mobile WebViews / browsers pick system theme.
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
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <GalzuClerkProvider>
          <CapacitorAuthBridge />
          <RevenueCatInitializer />
          <AppHeader />
          {children}
        </GalzuClerkProvider>
      </body>
    </html>
  );
}
