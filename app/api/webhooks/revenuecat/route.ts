import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { upsertSubscriptionEntitlement } from "@/lib/db/index";
import { getServerEnv } from "@/lib/env";
import type { SubscriptionStatus } from "@/types/database";

/**
 * RevenueCat webhook receiver — the sync side of the entitlement columns on
 * `user_profiles`. Requires:
 *   1. `REVENUECAT_WEBHOOK_SECRET` set to whatever "Authorization" header
 *      value you configure for this endpoint in the RevenueCat dashboard
 *      (Project settings -> Integrations -> Webhooks).
 *   2. `Purchases.configure({ appUserID })` to have been called with the
 *      Clerk user id (see `lib/capacitor/purchases.ts`), so `app_user_id`
 *      here always matches a `user_profiles.id` row.
 *
 * Until both exist (i.e. before a RevenueCat project + store products are
 * set up), this route just 501s — safe to deploy today with zero risk.
 */

type RevenueCatEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "PRODUCT_CHANGE"
  | "UNCANCELLATION"
  | "NON_RENEWING_PURCHASE"
  | "CANCELLATION"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "SUBSCRIPTION_PAUSED"
  | "TRANSFER"
  | "TEST";

type RevenueCatEvent = {
  id?: string;
  type: RevenueCatEventType;
  app_user_id: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
};

type RevenueCatWebhookBody = {
  api_version?: string;
  event: RevenueCatEvent;
};

function isAuthorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(header);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Maps a RevenueCat event onto our two-tier `plan_tier` + `subscription_status` model. */
function resolveEntitlement(event: RevenueCatEvent): {
  plan_tier: "free" | "pro";
  subscription_status: SubscriptionStatus;
} {
  const hasEntitlement = Boolean(event.entitlement_ids?.length);

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "NON_RENEWING_PURCHASE":
    case "TEST":
      return {
        plan_tier: hasEntitlement ? "pro" : "free",
        subscription_status: "active",
      };
    case "BILLING_ISSUE":
      // Store-managed grace period — access continues while retries happen.
      return { plan_tier: "pro", subscription_status: "grace_period" };
    case "CANCELLATION":
      // Auto-renew turned off, but access continues until expiration_at_ms.
      return { plan_tier: "pro", subscription_status: "cancelled" };
    case "EXPIRATION":
    case "SUBSCRIPTION_PAUSED":
      return { plan_tier: "free", subscription_status: "expired" };
    case "TRANSFER":
      // Entitlement moved to a different app_user_id — nothing to grant on
      // *this* profile; the other profile's own event handles the grant.
      return { plan_tier: "free", subscription_status: "none" };
    default:
      return { plan_tier: "free", subscription_status: "none" };
  }
}

export async function POST(request: NextRequest) {
  const { REVENUECAT_WEBHOOK_SECRET } = getServerEnv();

  if (!REVENUECAT_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "RevenueCat webhook is not configured yet." },
      { status: 501 },
    );
  }

  if (!isAuthorized(request, REVENUECAT_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RevenueCatWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const event = body.event;
  if (!event?.app_user_id || !event.type) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const { plan_tier, subscription_status } = resolveEntitlement(event);

  try {
    await upsertSubscriptionEntitlement(event.app_user_id, {
      plan_tier,
      subscription_status,
      subscription_expires_at: event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null,
      revenuecat_app_user_id: event.app_user_id,
    });
  } catch (error) {
    // app_user_id may not match any existing profile (e.g. a test event, or
    // a purchase made before the user ever signed into this app) — RevenueCat
    // retries 5xx responses, which would just repeat the same failure, so
    // log and 200 rather than triggering pointless retries.
    console.error("[revenuecat-webhook] failed to sync entitlement:", error);
  }

  return NextResponse.json({ status: "received" });
}
