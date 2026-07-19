import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DeleteCourseButton } from "@/components/courses/delete-course-button";
import { RoadmapTimeline } from "@/components/courses/roadmap-timeline";
import { GlassCard } from "@/components/ui/glass-card";
import { getActiveLessonId, computeCourseProgress } from "@/lib/course-progress";
import { flatModuleLabels } from "@/lib/course-roadmap";
import {
  getCourseById,
  listLessonsForCourse,
} from "@/lib/db/index";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { courseId } = await params;
  const course = await getCourseById(courseId);
  if (!course || course.user_id !== userId) notFound();

  const lessons = await listLessonsForCourse(courseId);
  const { percent, completed, total } = computeCourseProgress(lessons);
  const activeLessonId = getActiveLessonId(lessons);
  const tree = course.roadmap_tree;
  const moduleLabels = tree ? flatModuleLabels(tree) : [];
  // Derived from actual counts rather than a scope_type lookup table — depth
  // tiers no longer map 1:1 to a single lessons-per-module ratio (e.g.
  // "overview" and "deep_dive" both use scope_type "unit" but generate a
  // different number of lessons per module).
  const lessonsPerModule =
    moduleLabels.length > 0
      ? Math.max(1, Math.round(lessons.length / moduleLabels.length))
      : 1;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-violet-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            {course.scope_type} course · {total} lessons
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
          {course.description ? (
            <p className="text-zinc-600 dark:text-zinc-400">{course.description}</p>
          ) : null}
        </div>
        <DeleteCourseButton courseId={courseId} courseTitle={course.title} />
      </div>

      <GlassCard className="p-4">
        <div className="mb-2 flex justify-between text-sm text-zinc-500">
          <span>Progress</span>
          <span>
            {completed}/{total} lessons · {percent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        {activeLessonId ? (
          <Link
            href={`/courses/${courseId}/lessons/${activeLessonId}`}
            className="mt-3 inline-block text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
          >
            Continue learning →
          </Link>
        ) : null}
      </GlassCard>

      {tree && lessons.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Roadmap & lessons</h2>
          <p className="text-sm text-zinc-500">
            Lessons unlock sequentially — complete each lesson to open the next.
          </p>
          <RoadmapTimeline
            lessons={lessons}
            courseId={courseId}
            activeLessonId={activeLessonId}
            lessonsPerModule={lessonsPerModule}
            moduleLabels={moduleLabels}
          />
        </section>
      ) : (
        <GlassCard className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
          No lessons yet for this course.
        </GlassCard>
      )}
    </div>
  );
}
