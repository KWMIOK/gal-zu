import { dailyGenerationLimitForPlan } from "@/lib/generation/quota-shared";
import type { PlanTier } from "@/types/database";

/**
 * Single source of truth for tier copy/pricing shown in the UI. Pure data —
 * safe to import from client components. The actual purchase flow doesn't
 * exist yet (see `lib/capacitor/purchases.ts`): this only drives what the
 * "Upgrade" nudge *says*, not what it does, until RevenueCat + store
 * products are configured.
 */
export type PlanTierCopy = {
  tier: PlanTier;
  name: string;
  priceLabel: string;
  dailyLessonLimit: number;
  tagline: string;
  features: string[];
};

export const PLAN_TIERS: Record<PlanTier, PlanTierCopy> = {
  free: {
    tier: "free",
    name: "Free",
    priceLabel: "$0",
    dailyLessonLimit: dailyGenerationLimitForPlan("free"),
    tagline: "Quick answer & Overview — try Gal-zu without a card.",
    features: [
      "Unlimited Quick answer & Overview while browsing as a guest",
      `${dailyGenerationLimitForPlan("free")} signed-in generations per day`,
      "Full slide decks with narration, animations & practice widgets",
      "Deep Dive & Complete Mastery require Pro (not unlocked by signup)",
    ],
  },
  pro: {
    tier: "pro",
    name: "Gal-zu Pro",
    priceLabel: "$7.99/mo",
    dailyLessonLimit: dailyGenerationLimitForPlan("pro"),
    tagline: "Full depth tiers plus a much higher daily generation budget.",
    features: [
      `${dailyGenerationLimitForPlan("pro")} lesson generations per day`,
      "Deep Dive and Complete Mastery courses",
      "Priority access to new lesson formats",
      "Support indie development of Gal-zu",
    ],
  },
};
