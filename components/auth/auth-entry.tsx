"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { NativeAuthPanel } from "@/components/auth/native-auth-panel";
import { useGalzuClerkAppearance } from "@/components/clerk/galzu-clerk-provider";
import { isNativePlatform } from "@/lib/capacitor/is-native";

type Mode = "sign-in" | "sign-up";

type PlatformKind = "unknown" | "native" | "web";

/**
 * Web keeps Clerk's hosted `<SignIn />` / `<SignUp />` components
 * (system light/dark via `useGalzuClerkAppearance`). Capacitor uses
 * `NativeAuthPanel` only — never mount Clerk's Google OAuth UI on native
 * (even for one frame), or Android will eject to Chrome.
 */
export function AuthEntry({ mode }: { mode: Mode }) {
  const [platform, setPlatform] = useState<PlatformKind>("unknown");
  const { appearance, signUpPageAppearance } = useGalzuClerkAppearance();

  useEffect(() => {
    setPlatform(isNativePlatform() ? "native" : "web");
  }, []);

  if (platform === "unknown") {
    return (
      <div
        className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        aria-busy="true"
        aria-label="Loading sign-in"
      >
        <div className="mx-auto h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  if (platform === "native") {
    return <NativeAuthPanel mode={mode} />;
  }

  return mode === "sign-in" ? (
    <SignIn
      appearance={appearance}
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  ) : (
    <SignUp
      appearance={signUpPageAppearance}
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      forceRedirectUrl="/onboarding"
      fallbackRedirectUrl="/onboarding"
    />
  );
}
