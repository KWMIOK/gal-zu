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
    tagline: "Enough to try Gal-zu properly every day.",
    features: [
      `${dailyGenerationLimitForPlan("free")} lesson generations per day`,
      "Full slide decks with narration, animations & practice widgets",
      "All course depths (quick answer + complete mastery)",
    ],
  },
  pro: {
    tier: "pro",
    name: "Gal-zu Pro",
    priceLabel: "$7.99/mo",
    dailyLessonLimit: dailyGenerationLimitForPlan("pro"),
    tagline: "For daily learners who outgrow the free cap.",
    features: [
      `${dailyGenerationLimitForPlan("pro")} lesson generations per day`,
      "Priority access to new lesson formats",
      "Support indie development of Gal-zu",
    ],
  },
};
