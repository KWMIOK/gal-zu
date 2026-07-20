import "server-only";

import {
  createLesson,
  fetchTrustedRagContext,
  getCourseById,
  getLessonById,
  getOrCreateUserProfile,
  listLessonsForCourse,
  recordGenerationEvent,
  saveGeneratedLessonContent,
  tryClaimCourseForClassification,
  tryClaimLessonForGeneration,
  updateCourse,
} from "@/lib/db/index";
import type { PromptDepth, PromptSessionLength } from "@/lib/generation/create-course";
import { buildScopeHints, type GeminiGenerationContext } from "@/lib/generation/prompt";
import { assertWithinDailyQuota } from "@/lib/generation/quota";
import { classifyAndBuildRoadmap, generateLessonPayload } from "@/lib/gemini";
import { buildLessonPlans, slideCountTarget } from "@/lib/gemini/lesson-plans";
import type {
  Course,
  Lesson,
  LessonContentPayload,
  LessonFormat,
  LessonGenerationPlan,
  UserProfile,
} from "@/types/database";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Best-effort usage logging — a failure here must never undo or mask a
 * lesson/course that was already generated and saved successfully.
 */
export async function logGenerationEvent(
  kind: "classification" | "lesson",
): Promise<void> {
  try {
    await recordGenerationEvent(kind);
  } catch (error) {
    console.error(`[generation] failed to record ${kind} usage event:`, error);
  }
}

/**
 * The one real Gemini call for a single lesson, shared by the eager path
 * (lesson 1, generated inline while the learner waits) and the lazy path
 * (every later lesson — see `ensureLessonGenerated`). Checked against the
 * daily quota *per call* now, not once for the whole course, since a course
 * can defer most of its lessons to well after creation.
 */
export async function generateContentForPlan(
  profile: UserProfile,
  plan: LessonGenerationPlan,
  format: LessonFormat,
): Promise<LessonContentPayload> {
  await assertWithinDailyQuota(profile);

  const rag = await fetchTrustedRagContext(plan.topic);
  const ragContext =
    rag.chunks.length > 0
      ? rag.chunks
          .map((chunk) => `Source: ${chunk.source}\n${chunk.text}`)
          .join("\n\n")
      : undefined;

  const contentPayload = await generateLessonPayload(
    plan.topic,
    format,
    profile,
    plan.context,
    { min: plan.slideMin, max: plan.slideMax },
    ragContext,
  );
  await logGenerationEvent("lesson");
  return contentPayload;
}

/**
 * Idempotent, race-safe "make sure this lesson has real content" — call it
 * right before rendering a lesson page. If the lesson is already `ready`,
 * this is a single cheap read. Otherwise it claims the row (see
 * `tryClaimLessonForGeneration`), generates content from the stored
 * `generation_plan`, and saves it.
 *
 * Can throw `CreateCourseFromPromptError("CAP_REACHED", …)` (bubbled up
 * from `assertWithinDailyQuota`) if the learner is out of quota — callers
 * should catch that and render an upgrade nudge rather than a generic
 * error.
 */
export async function ensureLessonGenerated(lessonId: string): Promise<Lesson> {
  let lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  if (lesson.generation_status === "ready") {
    return lesson;
  }

  if (lesson.generation_status === "generating") {
    // Someone else (a background prefetch, most likely) is already working
    // on it — poll briefly rather than paying for a second Gemini call.
    for (let attempt = 0; attempt < 10; attempt++) {
      await sleep(3000);
      lesson = await getLessonById(lessonId);
      if (!lesson) throw new Error("Lesson not found.");
      if (lesson.generation_status !== "generating") break;
    }
    if (lesson.generation_status === "ready") {
      return lesson;
    }
    // Fell through still not ready (e.g. the other attempt crashed) — retry
    // ourselves below instead of leaving the learner stuck forever.
  }

  const claimed = await tryClaimLessonForGeneration(lessonId);
  if (!claimed) {
    // Lost the claim race — re-read once; if it's ready now, great, if it's
    // still pending/generating, hand it back as-is so the caller can show a
    // loading state instead of double-generating.
    const latest = await getLessonById(lessonId);
    if (!latest) throw new Error("Lesson not found.");
    return latest;
  }

  if (!claimed.generation_plan) {
    return saveGeneratedLessonContent(
      lessonId,
      null,
      "failed",
      "This lesson has no stored generation plan to build from (missing generation_plan on a pending row) — this indicates a bug in course creation, not a Gemini failure.",
    );
  }

  try {
    const profile = await getOrCreateUserProfile();
    const contentPayload = await generateContentForPlan(
      profile,
      claimed.generation_plan,
      claimed.format,
    );
    return await saveGeneratedLessonContent(lessonId, contentPayload, "ready");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await saveGeneratedLessonContent(lessonId, null, "failed", message);
    throw error;
  }
}

/**
 * Fire-and-forget warm-up for the next un-generated lesson in a course —
 * meant to be scheduled with `after()` from a Server Action (course
 * creation, lesson completion) so it runs after the response is already on
 * its way to the client instead of blocking it. Swallows all errors: this
 * is purely a latency optimization, `ensureLessonGenerated`'s synchronous
 * on-open call is the actual correctness guarantee if this never runs or
 * loses a race.
 */
export async function prefetchNextPendingLesson(courseId: string): Promise<void> {
  try {
    const lessons = await listLessonsForCourse(courseId);
    const next = lessons.find((l) => l.generation_status === "pending");
    if (!next) return;
    await ensureLessonGenerated(next.id);
  } catch (error) {
    console.error("[generation] background prefetch failed:", error);
  }
}

/**
 * Does the actual classification + lesson-1 generation for a claimed
 * `classifying`/`failed` course row. This is the one place that used to run
 * synchronously inside the `createCourseFromPrompt` Server Action — moved
 * here so it can run from either an `after()` warm-start *or* the course
 * page's own `ensureCourseClassified` call, whichever gets there first, with
 * no risk of it ever being the thing that makes a Server Action itself time
 * out (see the Phase 7c migration comment for why that mattered).
 */
async function runCourseClassification(courseId: string): Promise<Course> {
  const claimed = await tryClaimCourseForClassification(courseId);
  if (!claimed) {
    const latest = await getCourseById(courseId);
    if (!latest) throw new Error("Course not found.");
    return latest;
  }

  if (!claimed.topic) {
    return updateCourse(courseId, {
      status: "failed",
      generation_error:
        "This course has no stored topic to classify from (missing `topic` on a classifying row) — this indicates a bug in course creation, not a Gemini failure.",
    });
  }

  try {
    const profile = await getOrCreateUserProfile();
    const generationContext: GeminiGenerationContext = {
      depth: (claimed.depth as PromptDepth | null) ?? undefined,
      sessionLength: (claimed.session_length as PromptSessionLength | null) ?? undefined,
    };

    await assertWithinDailyQuota(profile);
    const classification = await classifyAndBuildRoadmap(
      claimed.topic,
      profile,
      generationContext,
    );
    await logGenerationEvent("classification");

    const baseContext = [
      `Course title: ${classification.title}`,
      classification.description,
      `Scope: ${classification.scope_type}`,
      buildScopeHints(generationContext),
    ]
      .filter(Boolean)
      .join("\n");

    const lessonPlans = buildLessonPlans(classification, claimed.topic, generationContext);
    const slides = slideCountTarget(generationContext);

    // Only lesson 1 is generated synchronously here too — everything after
    // that is a `pending` placeholder filled in lazily, exactly like before
    // this file existed; classification just joined that same model instead
    // of running ahead of it inside the Server Action.
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
        const contentPayload = await generateContentForPlan(profile, generationPlan, plan.format);
        await createLesson({
          course_id: courseId,
          title: plan.title,
          format: plan.format,
          order_index: i,
          content_payload: contentPayload,
          generation_status: "ready",
        });
        continue;
      }

      await createLesson({
        course_id: courseId,
        title: plan.title,
        format: plan.format,
        order_index: i,
        generation_status: "pending",
        generation_plan: generationPlan,
      });
    }

    const ready = await updateCourse(courseId, {
      title: classification.title,
      description: classification.description,
      scope_type: classification.scope_type,
      roadmap_tree: classification.roadmap_tree,
      status: "ready",
      generation_error: null,
    });

    if (lessonPlans.length > 1) {
      await prefetchNextPendingLesson(courseId);
    }

    return ready;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return updateCourse(courseId, { status: "failed", generation_error: message });
  }
}

/**
 * Idempotent, race-safe "make sure this course has a real roadmap + lesson
 * 1" — call it right before rendering the course page. Mirrors
 * `ensureLessonGenerated` one level up: cheap read if already `ready`,
 * otherwise claims and classifies. Unlike `ensureLessonGenerated`, this
 * never throws on failure (including `CAP_REACHED`) — `runCourseClassification`
 * catches everything itself and lands it in `courses.generation_error`, so
 * the caller (the course page) only ever needs to branch on `course.status`
 * and read `course.generation_error`, the same way it already reads
 * `roadmap_tree`/`lessons`.
 */
export async function ensureCourseClassified(courseId: string): Promise<Course> {
  let course = await getCourseById(courseId);
  if (!course) {
    throw new Error("Course not found.");
  }

  if (course.status === "ready") {
    return course;
  }

  if (course.status === "classifying" && course.classification_started_at) {
    // Someone else (most likely the after()-scheduled warm-start kicked off
    // at course creation) already claimed this — poll briefly rather than
    // racing a second classification call for the same course.
    for (let attempt = 0; attempt < 10; attempt++) {
      await sleep(3000);
      course = await getCourseById(courseId);
      if (!course) throw new Error("Course not found.");
      if (course.status !== "classifying") break;
    }
    if (course.status === "ready") {
      return course;
    }
    // Still stuck after polling — fall through. `runCourseClassification`'s
    // own claim will only actually reclaim it once it's genuinely stale, so
    // this is safe even if the other attempt is still legitimately running.
  }

  return runCourseClassification(courseId);
}
