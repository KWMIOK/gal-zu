import type { PromptDepth } from "@/lib/generation/create-course";
import type { PlanTier } from "@/types/database";

/** Depths anyone (guest or free account) may use without Pro. */
export const FREE_PROMPT_DEPTHS = ["quick_answer", "overview"] as const;

/** Depths that require an active paid entitlement — never unlocked by signup alone. */
export const PAID_PROMPT_DEPTHS = ["deep_dive", "complete_mastery"] as const;

export type FreePromptDepth = (typeof FREE_PROMPT_DEPTHS)[number];
export type PaidPromptDepth = (typeof PAID_PROMPT_DEPTHS)[number];

export function isPaidPromptDepth(
  depth: PromptDepth | null | undefined,
): depth is PaidPromptDepth {
  return (
    depth === "deep_dive" || depth === "complete_mastery"
  );
}

export function isFreePromptDepth(
  depth: PromptDepth | null | undefined,
): depth is FreePromptDepth {
  return depth === "quick_answer" || depth === "overview";
}

/**
 * Pro (`plan_tier === "pro"`) may use every depth. Guests and free accounts
 * only get quick answer + overview.
 */
export function canAccessPromptDepth(
  planTier: PlanTier | "guest",
  depth: PromptDepth,
): boolean {
  if (!isPaidPromptDepth(depth)) return true;
  return planTier === "pro";
}

export const DEPTH_LOCKED_MESSAGE_PREFIX = "[depth]";

export function isDepthLockedMessage(message: string): boolean {
  return message.startsWith(DEPTH_LOCKED_MESSAGE_PREFIX);
}

export function stripDepthLockedPrefix(message: string): string {
  return message.startsWith(DEPTH_LOCKED_MESSAGE_PREFIX)
    ? message.slice(DEPTH_LOCKED_MESSAGE_PREFIX.length).trim()
    : message;
}

export const PAID_DEPTH_LOCK_COPY =
  "Deep Dive and Complete Mastery need Gal-zu Pro (credits / a subscription). " +
  "Creating a free account does not unlock them — it only saves your progress and preferences. " +
  "Quick answer and Overview stay free.";
