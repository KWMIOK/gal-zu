import type { PlanTier } from "@/types/database";

/**
 * Daily generation caps, counted in "Gemini calls" (one roadmap
 * classification, or one lesson payload — see `recordGenerationEvent`).
 * `pro` is intentionally generous rather than literally unlimited — even a
 * paying subscriber shouldn't be able to script unbounded API spend.
 *
 * Pure/client-safe module: no `lib/db` or `next/headers` imports, so this
 * can be imported from both server code and "use client" components (e.g.
 * to render "X of Y lessons left today"). Server-only logic that actually
 * reads/writes the database lives in `lib/generation/quota.ts`.
 */
const DAILY_GENERATION_LIMITS: Record<PlanTier, number> = {
  free: 6,
  pro: 200,
};

export function dailyGenerationLimitForPlan(tier: PlanTier): number {
  return DAILY_GENERATION_LIMITS[tier] ?? DAILY_GENERATION_LIMITS.free;
}

export type QuotaSummary = {
  used: number;
  limit: number;
  remaining: number;
  /** ISO timestamp — the rolling window resets ~24h after the oldest event in it. */
  windowStartedAt: string;
};

/**
 * Stable prefix so the client can distinguish "cap reached" from other
 * generic failures and render an upgrade nudge instead of a plain error —
 * Server Action errors only reliably carry `.message` across the
 * server/client boundary, not `CreateCourseFromPromptError.code`.
 */
export const CAP_REACHED_MESSAGE_PREFIX = "[quota]";

export function isCapReachedMessage(message: string): boolean {
  return message.startsWith(CAP_REACHED_MESSAGE_PREFIX);
}

export function stripCapReachedPrefix(message: string): string {
  return message.startsWith(CAP_REACHED_MESSAGE_PREFIX)
    ? message.slice(CAP_REACHED_MESSAGE_PREFIX.length).trim()
    : message;
}
