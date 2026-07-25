"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { getOrCreateUserProfile, markLessonCompleted } from "@/lib/db/index";
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

  // No background Gemini warm-up here. Finishing a lesson is a free DB write;
  // the next pending lesson is only generated when the learner opens it
  // (see user-spend consent rules in AGENTS.md).
}

/**
 * Opt-in Gemini spend — must only be called after the learner explicitly
 * clicks a labeled "uses AI" control in the quiz UI. Never fire this from
 * automatic wrong-answer handlers.
 */
export async function fetchQuizHintAction(
  questionPrompt: string,
  selectedChoice: string,
): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await getOrCreateUserProfile();
  return generateQuizHint(questionPrompt, selectedChoice, profile);
}
