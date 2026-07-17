"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Lock, PlayCircle } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import type { Lesson } from "@/types/database";

type LessonRowStatus = "completed" | "current" | "unlocked" | "locked";

function lessonRowStatus(
  lessonIndex: number,
  lessons: Lesson[],
  activeLessonId: string | null,
): LessonRowStatus {
  const lesson = lessons[lessonIndex];
  if (!lesson) return "locked";

  const previousDone =
    lessonIndex === 0 || lessons[lessonIndex - 1]?.is_completed === true;
  if (!previousDone) return "locked";

  if (lesson.is_completed) return "completed";
  if (lesson.id === activeLessonId) return "current";
  return "unlocked";
}

export function RoadmapTimeline({
  lessons,
  courseId,
  activeLessonId,
  lessonsPerModule = 1,
  moduleLabels,
}: {
  lessons: Lesson[];
  courseId: string;
  activeLessonId: string | null;
  lessonsPerModule?: number;
  moduleLabels: { phaseTitle: string; moduleTitle: string }[];
}) {
  return (
    <div className="space-y-3">
      {lessons.map((lesson, index) => {
        const status = lessonRowStatus(index, lessons, activeLessonId);
        const moduleIndex = Math.floor(index / lessonsPerModule);
        const label = moduleLabels[moduleIndex] ?? moduleLabels.at(-1);

        const Icon =
          status === "completed"
            ? CheckCircle2
            : status === "locked"
              ? Lock
              : status === "current"
                ? PlayCircle
                : Circle;

        const iconClass =
          status === "completed"
            ? "text-emerald-500"
            : status === "current"
              ? "text-violet-600"
              : status === "locked"
                ? "text-zinc-400"
                : "text-zinc-500";

        const body = (
          <GlassCard
            className={`flex items-center gap-4 p-4 transition ${
              status === "current"
                ? "ring-2 ring-violet-500/40"
                : status === "locked"
                  ? "opacity-60"
                  : ""
            }`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} />
            <div className="min-w-0 flex-1">
              {label ? (
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {label.phaseTitle} · {label.moduleTitle}
                </p>
              ) : null}
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {lesson.title}
              </p>
              <p className="text-xs text-zinc-500">
                Lesson {index + 1} · {lesson.format.replace("_", " ")}
                {lesson.is_completed ? " · Done" : ""}
              </p>
            </div>
            {status !== "locked" ? (
              <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                Open →
              </span>
            ) : (
              <span className="text-xs text-zinc-400">Complete prior lesson</span>
            )}
          </GlassCard>
        );

        if (status !== "locked") {
          return (
            <Link
              key={lesson.id}
              href={`/courses/${courseId}/lessons/${lesson.id}`}
            >
              {body}
            </Link>
          );
        }

        return <div key={lesson.id}>{body}</div>;
      })}
    </div>
  );
}
