import type { Lesson } from "@/types/database";

export function computeCourseProgress(lessons: Lesson[]): {
  total: number;
  completed: number;
  percent: number;
} {
  const total = lessons.length;
  const completed = lessons.filter((l) => l.is_completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
}

export function getActiveLessonId(lessons: Lesson[]): string | null {
  if (lessons.length === 0) return null;

  for (let i = 0; i < lessons.length; i++) {
    const previousDone =
      i === 0 || lessons[i - 1]?.is_completed === true;
    if (previousDone && !lessons[i].is_completed) {
      return lessons[i].id;
    }
  }

  return lessons[lessons.length - 1].id;
}

/** The lesson immediately after `currentLessonId` in course order, or null if it's the last one. */
export function getNextLessonId(
  lessons: Lesson[],
  currentLessonId: string,
): string | null {
  const index = lessons.findIndex((l) => l.id === currentLessonId);
  if (index === -1) return null;
  return lessons[index + 1]?.id ?? null;
}
