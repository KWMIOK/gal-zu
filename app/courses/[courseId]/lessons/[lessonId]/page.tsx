import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { LessonBlockedView } from "@/components/lessons/lesson-blocked-view";
import { LessonRenderer } from "@/components/lessons/lesson-renderer";
import { getNextLessonId } from "@/lib/course-progress";
import { getCourseById, listLessonsForCourse } from "@/lib/db/index";
import { CreateCourseFromPromptError } from "@/lib/generation/create-course";
import { ensureLessonGenerated } from "@/lib/generation/lazy";
import { stripCapReachedPrefix } from "@/lib/generation/quota-shared";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { courseId, lessonId } = await params;
  const course = await getCourseById(courseId);
  if (!course || course.user_id !== userId) notFound();

  const lessons = await listLessonsForCourse(courseId);
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson || lesson.course_id !== courseId) notFound();

  let resolvedLesson = lesson;
  let capReachedMessage: string | null = null;
  let debugMessage: string | null = null;

  if (lesson.generation_status !== "ready") {
    try {
      // Generates this one lesson on the spot if it's still a `pending`
      // placeholder — bounded to a single lesson's latency regardless of
      // how many more lessons the course has queued up. See
      // lib/generation/lazy.ts.
      resolvedLesson = await ensureLessonGenerated(lessonId);
    } catch (error) {
      if (
        error instanceof CreateCourseFromPromptError &&
        error.code === "CAP_REACHED"
      ) {
        capReachedMessage = stripCapReachedPrefix(error.message);
      } else {
        // Generation genuinely failed (no more silent placeholder fallback
        // — see lib/gemini.ts) — surface the real error instead of
        // crashing to Next's generic error page, so it's actually
        // diagnosable from the lesson itself.
        debugMessage = error instanceof Error ? error.message : String(error);
      }
    }
  }

  const nextLessonId = getNextLessonId(lessons, lessonId);

  if (capReachedMessage) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <LessonBlockedView
          courseId={courseId}
          reason="cap_reached"
          message={capReachedMessage}
        />
      </div>
    );
  }

  if (resolvedLesson.generation_status !== "ready" || !resolvedLesson.content_payload) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <LessonBlockedView
          courseId={courseId}
          reason="failed"
          // A live exception from this request takes priority; otherwise
          // fall back to whatever a prior background attempt recorded
          // (see generation_error on the lessons table).
          message={debugMessage ?? resolvedLesson.generation_error ?? undefined}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <LessonRenderer
        lesson={resolvedLesson}
        courseId={courseId}
        nextLessonId={nextLessonId}
      />
    </div>
  );
}
