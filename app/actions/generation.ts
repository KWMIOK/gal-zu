"use server";

import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";

import {
  createCourse,
  createLesson,
  deleteCourse,
  getOrCreateUserProfile,
  updateUserProfile,
} from "@/lib/db/index";
import {
  CreateCourseFromPromptError,
  type CreateCourseFromPromptOptions,
  type CreateCourseFromPromptResult,
} from "@/lib/generation/create-course";
import {
  generateContentForPlan,
  logGenerationEvent,
  prefetchNextPendingLesson,
} from "@/lib/generation/lazy";
import {
  buildScopeHints,
  sanitizeLearnerTopic,
} from "@/lib/generation/prompt";
import { assertWithinDailyQuota } from "@/lib/generation/quota";
import { classifyAndBuildRoadmap, GeminiEngineError } from "@/lib/gemini";
import {
  buildLessonPlans,
  slideCountTarget,
} from "@/lib/gemini/lesson-plans";
import type { LessonGenerationPlan } from "@/types/database";

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

  const generationContext = {
    depth: options?.depth,
    sessionLength: options?.sessionLength,
  };

  let createdCourseId: string | null = null;

  try {
    let profile = await getOrCreateUserProfile();

    if (options?.profilePatch && Object.keys(options.profilePatch).length > 0) {
      profile = await updateUserProfile(userId, options.profilePatch);
    }

    // Reject before spending anything on Gemini if the caller is already
    // out of quota for the day — see lib/generation/quota.ts for why this
    // is a pre-check rather than a mid-burst meter. Every later real call
    // (this classification, lesson 1 below, and every lazily-generated
    // lesson after that — see lib/generation/lazy.ts) re-checks quota
    // itself too, since a course's lessons can now be generated well after
    // this request returns.
    await assertWithinDailyQuota(profile);

    const classification = await classifyAndBuildRoadmap(
      cleanTopic,
      profile,
      generationContext,
    );
    await logGenerationEvent("classification");

    const course = await createCourse({
      user_id: userId,
      title: classification.title,
      description: classification.description,
      scope_type: classification.scope_type,
      roadmap_tree: classification.roadmap_tree,
    });
    createdCourseId = course.id;

    const baseContext = [
      `Course title: ${classification.title}`,
      classification.description,
      `Scope: ${classification.scope_type}`,
      buildScopeHints(generationContext),
    ]
      .filter(Boolean)
      .join("\n");

    const lessonPlans = buildLessonPlans(
      classification,
      cleanTopic,
      generationContext,
    );
    const slides = slideCountTarget(generationContext);

    let firstLessonId = "";

    // Only lesson 1 is generated synchronously, bounding this request to
    // "one classification + one lesson" latency (well under a minute)
    // regardless of how many lessons the full course plans to have.
    // Everything after that is created as a `pending` placeholder carrying
    // its own generation plan, then filled in lazily — via a background
    // prefetch kicked off below, or on-demand the moment a learner actually
    // opens it (see app/courses/[courseId]/lessons/[lessonId]/page.tsx).
    for (let i = 0; i < lessonPlans.length; i++) {
      const plan = lessonPlans[i];
      const generationPlan: LessonGenerationPlan = {
        topic: plan.topic,
        context: [
          baseContext,
          `Lesson ${i + 1} of ${lessonPlans.length}: ${plan.title}`,
          `Module: ${plan.moduleTitle} (${plan.phaseTitle})`,
        ].join("\n"),
        slideMin: slides.min,
        slideMax: slides.max,
      };

      if (i === 0) {
        const contentPayload = await generateContentForPlan(
          profile,
          generationPlan,
          plan.format,
        );
        const lesson = await createLesson({
          course_id: course.id,
          title: plan.title,
          format: plan.format,
          order_index: i,
          content_payload: contentPayload,
          generation_status: "ready",
        });
        firstLessonId = lesson.id;
        continue;
      }

      await createLesson({
        course_id: course.id,
        title: plan.title,
        format: plan.format,
        order_index: i,
        generation_status: "pending",
        generation_plan: generationPlan,
      });
    }

    if (lessonPlans.length > 1) {
      after(() => prefetchNextPendingLesson(course.id));
    }

    return {
      courseId: course.id,
      firstLessonId,
    };
  } catch (error) {
    if (createdCourseId) {
      // Lesson 1 failed after the course row was already created (almost
      // always a quota edge case — see assertWithinDailyQuota) — don't
      // leave an empty, broken course cluttering the dashboard.
      await deleteCourse(createdCourseId).catch(() => {});
    }

    if (error instanceof CreateCourseFromPromptError) {
      throw error;
    }
    if (error instanceof GeminiEngineError) {
      throw new CreateCourseFromPromptError(
        error.message,
        "GENERATION_FAILED",
        error,
      );
    }
    throw new CreateCourseFromPromptError(
      "Could not create your course. Please try again.",
      "GENERATION_FAILED",
      error,
    );
  }
}
