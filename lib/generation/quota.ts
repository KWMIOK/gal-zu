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
 * UI: a "Complete mastery" course can legitimately spend 9-13 calls in one
 * burst (1 classification + up to 6 modules x 2 lessons — see
 * `ensureMacroRoadmapScale` / `buildLessonPlans`), so the cap is checked
 * *before* starting a course (reject if already at/over budget for the
 * day) rather than metered mid-burst. Worst case, one mastery course can
 * push a user slightly over their daily budget in a single request; it
 * cannot repeat that same-day once they're over.
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
