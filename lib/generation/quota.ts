import { countGenerationEventsSince } from "@/lib/db/index";
import type { UserProfile } from "@/types/database";

import { CreateCourseFromPromptError } from "./create-course";
import {
  CAP_REACHED_MESSAGE_PREFIX,
  dailyGenerationLimitForPlan,
  type QuotaSummary,
} from "./quota-shared";

export {
  dailyGenerationLimitForPlan,
  isCapReachedMessage,
  stripCapReachedPrefix,
  type QuotaSummary,
} from "./quota-shared";

/**
 * Server-only half of the daily generation cap — see `quota-shared.ts` for
 * the pure constants/helpers that are also safe to import from client
 * components.
 *
 * This is the actual cost-control mechanism, independent of any billing
 * UI. Every real Gemini call — the classification call, and each
 * individual lesson, whether generated eagerly (lesson 1) or lazily later
 * (see `lib/generation/lazy.ts`) — checks this cap right before it runs,
 * rather than once per course. A "complete_mastery" course can plan up to
 * ~28 lessons (see `DEPTH_TIER_CONFIG` in `lib/gemini/lesson-plans.ts`),
 * but only pays for however many the learner actually opens: most of the
 * cost is spread out over however many days it takes them to work through
 * it, not spent in one request.
 */
const ROLLING_WINDOW_HOURS = 24;

function windowStartIso(): string {
  return new Date(Date.now() - ROLLING_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}

/** Current usage against the caller's daily cap — safe to call just to render UI. */
export async function getQuotaSummary(profile: UserProfile): Promise<QuotaSummary> {
  const limit = dailyGenerationLimitForPlan(profile.plan_tier);
  const windowStartedAt = windowStartIso();
  const used = await countGenerationEventsSince(profile.id, windowStartedAt);

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    windowStartedAt,
  };
}

/**
 * Throws `CreateCourseFromPromptError("CAP_REACHED", …)` if the caller has
 * no quota left for the next ~24h. Call this *before* making any Gemini
 * call for a new course so a maxed-out user doesn't even pay for a
 * classification call that will be thrown away.
 */
export async function assertWithinDailyQuota(
  profile: UserProfile,
): Promise<QuotaSummary> {
  const summary = await getQuotaSummary(profile);

  if (summary.remaining <= 0) {
    const isFree = profile.plan_tier === "free";
    throw new CreateCourseFromPromptError(
      isFree
        ? `${CAP_REACHED_MESSAGE_PREFIX} You've used all ${summary.limit} free lessons for today. Come back tomorrow, or upgrade for a much higher daily limit.`
        : `${CAP_REACHED_MESSAGE_PREFIX} You've hit today's generation limit (${summary.limit}). This resets on a rolling 24-hour basis — try again shortly.`,
      "CAP_REACHED",
    );
  }

  return summary;
}
