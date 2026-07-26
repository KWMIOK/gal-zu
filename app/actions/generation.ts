"use server";

import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";

import {
  DEPTH_LOCKED_MESSAGE_PREFIX,
  PAID_DEPTH_LOCK_COPY,
  canAccessPromptDepth,
} from "@/lib/billing/depth-access";
import {
  createCourse,
  getActorContext,
  getOrCreateUserProfile,
  updateUserProfile,
} from "@/lib/db/index";
import {
  CreateCourseFromPromptError,
  type CreateCourseFromPromptOptions,
  type CreateCourseFromPromptResult,
  type PromptDepth,
} from "@/lib/generation/create-course";
import { ensureCourseClassified } from "@/lib/generation/lazy";
import { sanitizeLearnerTopic } from "@/lib/generation/prompt";
import { assertWithinDailyQuota } from "@/lib/generation/quota";

/**
 * Deliberately does no Gemini calls at all — just auth/input validation, an
 * up-front quota check (cheap DB read), and one fast insert. Classification
 * + lesson 1 generation run lazily on the course page (see
 * `ensureCourseClassified` in lib/generation/lazy.ts).
 *
 * Guests (cookie identity) may create Quick answer / Overview courses with
 * default prefs and no daily cap. Deep Dive / Complete Mastery require Pro
 * and are rejected here even if the UI is bypassed.
 */
export async function createCourseFromPrompt(
  userPrompt: string,
  options?: CreateCourseFromPromptOptions,
): Promise<CreateCourseFromPromptResult> {
  const actor = await getActorContext();
  const depth: PromptDepth = options?.depth ?? "quick_answer";

  const planKey = actor.isGuest
    ? ("guest" as const)
    : (await getOrCreateUserProfile()).plan_tier;

  if (!canAccessPromptDepth(planKey, depth)) {
    throw new CreateCourseFromPromptError(
      `${DEPTH_LOCKED_MESSAGE_PREFIX} ${PAID_DEPTH_LOCK_COPY}`,
      "DEPTH_LOCKED",
    );
  }

  const cleanTopic = sanitizeLearnerTopic(userPrompt);
  if (!cleanTopic) {
    throw new CreateCourseFromPromptError(
      "Please enter what you want to learn.",
      "INVALID_INPUT",
    );
  }

  let profile = await getOrCreateUserProfile();

  if (
    !actor.isGuest &&
    options?.profilePatch &&
    Object.keys(options.profilePatch).length > 0
  ) {
    const { userId } = await auth();
    if (userId) {
      profile = await updateUserProfile(userId, options.profilePatch);
    }
  }

  if (!actor.isGuest) {
    await assertWithinDailyQuota(profile);
  }

  const course = await createCourse({
    user_id: actor.userId,
    title: cleanTopic,
    scope_type: "unit",
    status: "classifying",
    topic: cleanTopic,
    depth,
    session_length: options?.sessionLength ?? null,
  });

  after(() =>
    ensureCourseClassified(course.id).catch((error) => {
      console.error("[generation] background classification warm-start failed:", error);
    }),
  );

  return { courseId: course.id };
}
