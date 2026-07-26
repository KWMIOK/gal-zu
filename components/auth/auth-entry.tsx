"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { NativeAuthPanel } from "@/components/auth/native-auth-panel";
import { useGalzuClerkAppearance } from "@/components/clerk/galzu-clerk-provider";
import { isNativePlatform } from "@/lib/capacitor/is-native";

type Mode = "sign-in" | "sign-up";

/**
 * Web keeps Clerk's hosted `<SignIn />` / `<SignUp />` components
 * (system light/dark via `useGalzuClerkAppearance`). Capacitor uses
 * `NativeAuthPanel`.
 */
export function AuthEntry({ mode }: { mode: Mode }) {
  const [native, setNative] = useState(false);
  const { appearance, signUpPageAppearance } = useGalzuClerkAppearance();

  useEffect(() => {
    setNative(isNativePlatform());
  }, []);

  if (native) {
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
