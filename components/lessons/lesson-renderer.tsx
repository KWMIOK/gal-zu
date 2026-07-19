"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, PartyPopper } from "lucide-react";

import {
  completeLessonAction,
  prefetchNextLessonAction,
} from "@/app/actions/lessons";
import { DeleteLessonButton } from "@/components/lessons/delete-lesson-button";
import {
  CheatSheetViewer,
  ScriptViewer,
} from "@/components/lessons/markdown-viewers";
import { QuizViewer } from "@/components/lessons/quiz-viewer";
import { SlideDeckViewer } from "@/components/lessons/slide-deck-viewer";
import type {
  CheatSheetContent,
  Lesson,
  QuizContent,
  ScriptContent,
  SlideContent,
} from "@/types/database";

export function LessonRenderer({
  lesson,
  courseId,
  nextLessonId,
}: {
  lesson: Lesson;
  courseId: string;
  /** The next lesson in course order, or null if this is the last one / a solo course. */
  nextLessonId?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    prefetchNextLessonAction(courseId).catch(() => {});
  }, [courseId, lesson.id]);

  function markComplete() {
    startTransition(async () => {
      await completeLessonAction(courseId, lesson.id);
    });
  }

  const payload = lesson.content_payload;
  if (!payload) {
    // The page component is responsible for generating content before
    // rendering this — reaching here with no payload means something
    // unexpected slipped through, so fail loudly-ish rather than crash on
    // `payload.type`.
    return (
      <p className="text-sm text-zinc-500">
        This lesson has no content yet. Try reopening it.
      </p>
    );
  }
  const finishedCta = nextLessonId
    ? { href: `/courses/${courseId}/lessons/${nextLessonId}`, label: "Next lesson" }
    : { href: `/courses/${courseId}`, label: "Course complete — view roadmap" };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-violet-600 dark:text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to roadmap
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <DeleteLessonButton
            courseId={courseId}
            lessonId={lesson.id}
            lessonTitle={lesson.title}
          />
          {!lesson.is_completed ? (
            <button
              type="button"
              disabled={pending}
              onClick={markComplete}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4" />
              {pending ? "Saving…" : "Mark complete"}
            </button>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Completed
              </span>
              {payload.type === "cheat_sheet" || payload.type === "script" ? (
                <Link
                  href={finishedCta.href}
                  className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                >
                  {nextLessonId ? (
                    <>
                      {finishedCta.label} <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <PartyPopper className="h-4 w-4" /> {finishedCta.label}
                    </>
                  )}
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
          {lesson.format.replace("_", " ")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
      </div>

      {payload.type === "slideshow" ? (
        <SlideDeckViewer
          content={payload as SlideContent}
          onFinish={markComplete}
          finishedCta={finishedCta}
          alreadyCompleted={lesson.is_completed}
        />
      ) : null}
      {payload.type === "cheat_sheet" ? (
        <CheatSheetViewer content={payload as CheatSheetContent} />
      ) : null}
      {payload.type === "quiz" ? (
        <QuizViewer
          content={payload as QuizContent}
          onComplete={markComplete}
          finishedCta={finishedCta}
        />
      ) : null}
      {payload.type === "script" ? (
        <ScriptViewer content={payload as ScriptContent} />
      ) : null}
    </div>
  );
}
