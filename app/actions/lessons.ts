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
