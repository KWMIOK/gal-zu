"use client";

import {
  LOG_LEVEL,
  Purchases,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";

import { getNativePlatform, isNativePlatform } from "@/lib/capacitor/is-native";
import { getPublicEnv } from "@/lib/env";

/**
 * Every function here is deliberately a safe no-op until:
 *   1. `NEXT_PUBLIC_REVENUECAT_IOS_KEY` / `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`
 *      are set (which itself requires a RevenueCat project linked to real
 *      App Store Connect / Play Console apps — i.e. the paid developer
 *      accounts), and
 *   2. the app is actually running on a native platform (RevenueCat has
 *      nothing to sell on web — there's no store to bill through there).
 *
 * That means this module can be wired into the UI today with zero cost and
 * zero risk: on web, and on native builds before those env vars exist, every
 * call resolves to "not configured" and callers treat that identically to
 * "user is on the free tier". Flipping on real purchases later is just
 * setting the two env vars and creating the products in RevenueCat — no
 * code changes needed here.
 */

let configuredForUserId: string | null = null;

function isConfigured(): boolean {
  const { NEXT_PUBLIC_REVENUECAT_IOS_KEY, NEXT_PUBLIC_REVENUECAT_ANDROID_KEY } =
    getPublicEnv();
  return Boolean(NEXT_PUBLIC_REVENUECAT_IOS_KEY || NEXT_PUBLIC_REVENUECAT_ANDROID_KEY);
}

export function isRevenueCatAvailable(): boolean {
  return isNativePlatform() && isConfigured();
}

/**
 * Configures the RevenueCat SDK once per app-user-id. Safe to call on every
 * app start / sign-in — it no-ops if already configured for this user, and
 * no-ops entirely when unavailable (see module doc above).
 *
 * Pass the Clerk user id as `appUserId` so RevenueCat's `app_user_id`
 * matches `user_profiles.id` 1:1 — the webhook route relies on that to know
 * which profile to update.
 */
export async function initializeRevenueCat(appUserId: string): Promise<void> {
  if (!isRevenueCatAvailable()) return;
  if (configuredForUserId === appUserId) return;

  const { NEXT_PUBLIC_REVENUECAT_IOS_KEY, NEXT_PUBLIC_REVENUECAT_ANDROID_KEY } =
    getPublicEnv();
  const platform = getNativePlatform();
  const apiKey =
    platform === "ios"
      ? NEXT_PUBLIC_REVENUECAT_IOS_KEY
      : NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) return;

  if (process.env.NODE_ENV !== "production") {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  }
  await Purchases.configure({ apiKey, appUserID: appUserId });
  configuredForUserId = appUserId;
}

/** Returns `null` when RevenueCat isn't configured — callers should treat that as "free tier". */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!isRevenueCatAvailable()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo | null> {
  if (!isRevenueCatAvailable()) return null;
  const { customerInfo } = await Purchases.purchasePackage({
    aPackage: pkg,
  });
  return customerInfo;
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isRevenueCatAvailable()) return null;
  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isRevenueCatAvailable()) return null;
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}
