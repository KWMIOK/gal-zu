import "server-only";

import {
  fetchTrustedRagContext,
  getLessonById,
  getOrCreateUserProfile,
  listLessonsForCourse,
  recordGenerationEvent,
  saveGeneratedLessonContent,
  tryClaimLessonForGeneration,
} from "@/lib/db/index";
import { assertWithinDailyQuota } from "@/lib/generation/quota";
import { generateLessonPayload } from "@/lib/gemini";
import type {
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
