"use server";

import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";

import { createCourse, getOrCreateUserProfile, updateUserProfile } from "@/lib/db/index";
import {
  CreateCourseFromPromptError,
  type CreateCourseFromPromptOptions,
  type CreateCourseFromPromptResult,
} from "@/lib/generation/create-course";
import { ensureCourseClassified } from "@/lib/generation/lazy";
import { sanitizeLearnerTopic } from "@/lib/generation/prompt";
import { assertWithinDailyQuota } from "@/lib/generation/quota";

/**
 * Deliberately does no Gemini calls at all — just auth/input validation, an
 * up-front quota check (cheap DB read), and one fast insert. Classification
 * + lesson 1 generation (the actual slow, retry-with-backoff work — see
 * `ensureCourseClassified` in lib/generation/lazy.ts) used to run
 * synchronously right here, inside this same Server Action call, with
 * nothing bounding it below Vercel's own ~300s function-duration ceiling.
 * The heaviest depth tier (complete_mastery + multi_week — the largest
 * roadmap JSON, most likely to need every retry) could genuinely exceed
 * that, and a platform-killed invocation surfaces to the client as the
 * generic, undebuggable "An error occurred in the Server Components
 * render" — with the course never even created, a total dead end.
 *
 * Now that work happens lazily the moment the course page opens (the exact
 * same pattern lesson 2+ already used), with a warm-start kicked off here
 * via `after()` so it's often already done by the time the redirect lands.
 * If it's ever still slow, the course page just shows a loading state —
 * recoverable, not a crash — and if it genuinely fails, the real error
 * lands in `courses.generation_error` instead of being swallowed.
 */
export async function createCourseFromPrompt(
  userPrompt: string,
  options?: CreateCourseFromPromptOptions,
): Promise<CreateCourseFromPromptResult> {
  const { userId } = await auth();
  if (!userId) {
    throw new CreateCourseFromPromptError(
      "You must be signed in to create a course.",
      "UNAUTHORIZED",
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

  if (options?.profilePatch && Object.keys(options.profilePatch).length > 0) {
    profile = await updateUserProfile(userId, options.profilePatch);
  }

  // Reject before creating anything if the caller is already out of quota
  // for the day — see lib/generation/quota.ts. `ensureCourseClassified`
  // re-checks this itself too right before the real classification call,
  // since that can now happen well after this request returns.
  await assertWithinDailyQuota(profile);

  const course = await createCourse({
    user_id: userId,
    // Temporary placeholders — overwritten with the real title/scope the
    // moment classification lands (see `runCourseClassification`). Kept
    // non-null here only because the columns themselves are NOT NULL.
    title: cleanTopic,
    scope_type: "unit",
    status: "classifying",
    topic: cleanTopic,
    depth: options?.depth ?? null,
    session_length: options?.sessionLength ?? null,
  });

  after(() =>
    ensureCourseClassified(course.id).catch((error) => {
      console.error("[generation] background classification warm-start failed:", error);
    }),
  );

  return { courseId: course.id };
}
