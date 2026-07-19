"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { getOrCreateUserProfile, markLessonCompleted } from "@/lib/db/index";
import { prefetchNextPendingLesson } from "@/lib/generation/lazy";
import { generateQuizHint } from "@/lib/gemini";

export async function completeLessonAction(
  courseId: string,
  lessonId: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await markLessonCompleted(lessonId, true);
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard");

  // Warm up whatever's next while the learner is looking at the "lesson
  // complete" screen deciding whether to continue — see lib/generation/lazy.ts.
  after(() => prefetchNextPendingLesson(courseId));
}

/**
 * Fire-and-forget background warm-up, triggered from the client the moment
 * a lesson page mounts (see LessonRenderer) — keeps the "next pending
 * lesson" generation a step ahead of the learner even before they finish
 * the current one. Must run as a Server Action (not called directly from a
 * Server Component) so `after()` can access the authenticated Supabase
 * client it needs — see the `after` API's Server Component restrictions.
 */
export async function prefetchNextLessonAction(courseId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  after(() => prefetchNextPendingLesson(courseId));
}

export async function fetchQuizHintAction(
  questionPrompt: string,
  selectedChoice: string,
): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await getOrCreateUserProfile();
  return generateQuizHint(questionPrompt, selectedChoice, profile);
}
