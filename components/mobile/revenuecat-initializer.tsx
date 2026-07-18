"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

import { initializeRevenueCat, isRevenueCatAvailable } from "@/lib/capacitor/purchases";

/**
 * Mounted once near the root of the app. Configures the RevenueCat SDK with
 * the signed-in Clerk user id as `appUserID` once both are available.
 *
 * No-ops on web and on native builds until `NEXT_PUBLIC_REVENUECAT_*_KEY` is
 * set (see `lib/capacitor/purchases.ts`) — safe to render unconditionally.
 */
export function RevenueCatInitializer() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;
    if (!isRevenueCatAvailable()) return;

    void initializeRevenueCat(user.id).catch((error) => {
      console.error("[revenuecat] failed to initialize:", error);
    });
  }, [isSignedIn, user?.id]);

  return null;
}
