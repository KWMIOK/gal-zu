"use server";

import { auth } from "@clerk/nextjs/server";

import {
  createCourse,
  createLesson,
  getOrCreateUserProfile,
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
import {
  classifyAndBuildRoadmap,
  generateLessonPayload,
  GeminiEngineError,
} from "@/lib/gemini";
import {
  buildLessonPlans,
  slideCountTarget,
} from "@/lib/gemini/lesson-plans";

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

    const classification = await classifyAndBuildRoadmap(
      cleanTopic,
      profile,
      generationContext,
    );

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

      const contentPayload = await generateLessonPayload(
        plan.topic,
        plan.format,
        profile,
        lessonContext,
        slides,
      );

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
