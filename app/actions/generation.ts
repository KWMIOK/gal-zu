"use server";

import { auth } from "@clerk/nextjs/server";

import {
  createCourse,
  createLesson,
  fetchTrustedRagContext,
  getOrCreateUserProfile,
  recordGenerationEvent,
  updateUserProfile,
} from "@/lib/db/index";
import {
  CreateCourseFromPromptError,
  type CreateCourseFromPromptOptions,
  type CreateCourseFromPromptResult,
} from "@/lib/generation/create-course";
import {
  buildScopeHints,
  sanitizeLearnerTopic,
} from "@/lib/generation/prompt";
import { assertWithinDailyQuota } from "@/lib/generation/quota";
import {
  classifyAndBuildRoadmap,
  generateLessonPayload,
  GeminiEngineError,
} from "@/lib/gemini";
import {
  buildLessonPlans,
  slideCountTarget,
} from "@/lib/gemini/lesson-plans";

/**
 * Best-effort usage logging — a failure here must never undo or mask a
 * lesson/course that was already generated and saved successfully.
 */
async function logGenerationEvent(kind: "classification" | "lesson") {
  try {
    await recordGenerationEvent(kind);
  } catch (error) {
    console.error(`[generation] failed to record ${kind} usage event:`, error);
  }
}

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

  try {
    let profile = await getOrCreateUserProfile();

    if (options?.profilePatch && Object.keys(options.profilePatch).length > 0) {
      profile = await updateUserProfile(userId, options.profilePatch);
    }

    // Reject before spending anything on Gemini if the caller is already
    // out of quota for the day — see lib/generation/quota.ts for why this
    // is a pre-check rather than a mid-burst meter.
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

    for (let i = 0; i < lessonPlans.length; i++) {
      const plan = lessonPlans[i];
      const lessonContext = [
        baseContext,
        `Lesson ${i + 1} of ${lessonPlans.length}: ${plan.title}`,
        `Module: ${plan.moduleTitle} (${plan.phaseTitle})`,
      ].join("\n");

      // Stubbed today (see `fetchTrustedRagContext`) — always empty until
      // Phase 6 wires up a real LlamaIndex-backed retrieval store, at which
      // point verified textbook/doc chunks will flow straight into the
      // Gemini prompt here without any other call-site changes.
      const rag = await fetchTrustedRagContext(plan.topic);
      const ragContext =
        rag.chunks.length > 0
          ? rag.chunks
              .map((chunk) => `Source: ${chunk.source}\n${chunk.text}`)
              .join("\n\n")
          : undefined;

      const contentPayload = await generateLessonPayload(
        plan.topic,
        plan.format,
        profile,
        lessonContext,
        slides,
        ragContext,
      );
      await logGenerationEvent("lesson");

      const lesson = await createLesson({
        course_id: course.id,
        title: plan.title,
        format: plan.format,
        content_payload: contentPayload,
      });

      if (i === 0) {
        firstLessonId = lesson.id;
      }
    }

    return {
      courseId: course.id,
      firstLessonId,
    };
  } catch (error) {
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
