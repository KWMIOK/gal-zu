import type { UserProfileUpdate } from "@/types/database";

export type CreateCourseFromPromptResult = {
  courseId: string;
  firstLessonId: string;
};

export type PromptDepth = "quick_answer" | "complete_mastery";
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
