import type { UserProfileUpdate } from "@/types/database";

/**
 * `firstLessonId` no longer comes back synchronously — classification and
 * lesson 1 generation happen lazily the moment the course page opens (see
 * `ensureCourseClassified` in lib/generation/lazy.ts), the same pattern
 * already used for lesson 2+. This keeps course *creation* itself to a
 * couple of fast DB writes, no Gemini calls, so it can never be the thing
 * that times out a Server Action.
 */
export type CreateCourseFromPromptResult = {
  courseId: string;
};

/**
 * Four depth tiers instead of two — the old binary quick_answer/complete_mastery
 * split meant "learn a whole language" and "explain one theorem" both landed
 * on the same fixed 4-6 module shape. See lib/gemini/lesson-plans.ts for the
 * per-tier module/lesson-count bounds (which Gemini now picks *within*,
 * topic-aware, rather than a single hardcoded number).
 */
export type PromptDepth =
  | "quick_answer"
  | "overview"
  | "deep_dive"
  | "complete_mastery";
export type PromptSessionLength = "5min" | "20min" | "multi_week";

export type CreateCourseFromPromptOptions = {
  profilePatch?: UserProfileUpdate;
  depth?: PromptDepth;
  sessionLength?: PromptSessionLength;
};

export type CreateCourseFromPromptErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_INPUT"
  | "GENERATION_FAILED"
  | "CAP_REACHED";

export class CreateCourseFromPromptError extends Error {
  constructor(
    message: string,
    public readonly code: CreateCourseFromPromptErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CreateCourseFromPromptError";
  }
}

export {
  buildEnrichedPrompt,
  buildScopeHints,
  sanitizeLearnerTopic,
} from "@/lib/generation/prompt";
