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
  // Deliberately NOT also triggered on lesson-page mount: revisiting a ready
  // lesson must be free; only finishing one should spend a Gemini call on
  // the next pending lesson.
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
