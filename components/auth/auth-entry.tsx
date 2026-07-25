"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { NativeAuthPanel } from "@/components/auth/native-auth-panel";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { isNativePlatform } from "@/lib/capacitor/is-native";

type Mode = "sign-in" | "sign-up";

/**
 * Web keeps Clerk's hosted `<SignIn />` / `<SignUp />` components
 * (styled via `clerkAppearance`). Capacitor uses `NativeAuthPanel`.
 */
export function AuthEntry({ mode }: { mode: Mode }) {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativePlatform());
  }, []);

  if (native) {
    return <NativeAuthPanel mode={mode} />;
  }

  return mode === "sign-in" ? (
    <SignIn
      appearance={clerkAppearance}
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  ) : (
    <SignUp
      appearance={clerkAppearance}
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      forceRedirectUrl="/onboarding"
      fallbackRedirectUrl="/onboarding"
    />
  );
}
