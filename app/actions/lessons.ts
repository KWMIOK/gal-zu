"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import {
  getLessonById,
  getOrCreateUserProfile,
  markLessonCompleted,
  updateUserProfile,
} from "@/lib/db/index";
import {
  mergeLearningSignal,
  type LearningSignal,
} from "@/lib/generation/profile-adaptation";
import { generateQuizHint } from "@/lib/gemini";

/**
 * Free DB-only update of observed learning patterns. Never calls Gemini.
 */
async function applyLearningSignal(signal: LearningSignal): Promise<void> {
  const profile = await getOrCreateUserProfile();
  const next = mergeLearningSignal(profile.learning_adaptation, signal, {
    adhdMicro:
      profile.neurodivergent_accommodations.adhd.enabled ||
      profile.neurodivergent_accommodations.adhd.micro_learning_mode,
    pace: profile.learning_styles.preferred_pace,
  });
  await updateUserProfile(profile.id, { learning_adaptation: next });
}

export async function completeLessonAction(
  courseId: string,
  lessonId: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const lesson = await getLessonById(lessonId);
  await markLessonCompleted(lessonId, true);

  // Zero-cost adaptation: remember which formats this learner finishes so
  // future generation can lean toward what they actually engage with.
  if (lesson) {
    try {
      await applyLearningSignal({
        kind: "lesson_completed",
        format: lesson.format,
      });
    } catch (error) {
      console.error("[learning] failed to record lesson signal:", error);
    }
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard");
}

/**
 * Free DB-only quiz outcome signal — called when a quiz finishes. Does not
 * spend Gemini quota.
 */
export async function recordQuizOutcomeAction(
  scorePercent: number,
  questionCount: number,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    await applyLearningSignal({
      kind: "quiz_finished",
      scorePercent,
      questionCount,
    });
  } catch (error) {
    console.error("[learning] failed to record quiz signal:", error);
  }
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
