"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { DeleteCourseButton } from "@/components/courses/delete-course-button";
import { GlassCard } from "@/components/ui/glass-card";
import type { Course } from "@/types/database";

export type CourseWithProgress = Course & {
  progressPercent: number;
  completedCount: number;
  totalLessons: number;
  activeLessonId: string | null;
};

function CourseCard({ course }: { course: CourseWithProgress }) {
  return (
    <GlassCard className="group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-violet-500/10">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/courses/${course.id}`} className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            {course.scope_type}
          </p>
          <h3 className="mt-1 font-semibold text-zinc-900 group-hover:text-violet-700 dark:text-zinc-50">
            {course.title}
          </h3>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {course.status === "classifying" ? (
            <span title="Still building">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
            </span>
          ) : course.status === "failed" ? (
            <span title="Build failed — open to retry">
              <Clock className="h-5 w-5 text-red-400" />
            </span>
          ) : course.progressPercent === 100 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Clock className="h-5 w-5 text-zinc-400" />
          )}
          <DeleteCourseButton
            courseId={course.id}
            courseTitle={course.title}
            variant="icon"
            afterDelete="refresh"
          />
        </div>
      </div>
      <Link href={`/courses/${course.id}`} className="mt-2 block flex-1">
        {course.description ? (
          <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {course.description}
          </p>
        ) : null}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>
              {course.completedCount}/{course.totalLessons} lessons
            </span>
            <span>{course.progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
              style={{ width: `${course.progressPercent}%` }}
            />
          </div>
        </div>
      </Link>
    </GlassCard>
  );
}

export function CourseGrid({ courses }: { courses: CourseWithProgress[] }) {
  if (courses.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-violet-500" />
        <p className="mt-3 font-medium text-zinc-900 dark:text-zinc-50">
          No courses yet
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Use the prompt above to generate your first adaptive course.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
