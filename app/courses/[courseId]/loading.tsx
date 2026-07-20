import { Sparkles } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";

/**
 * Covers the case where opening a course triggers `ensureCourseClassified`
 * synchronously on the server (see page.tsx) — a freshly-created course can
 * take a while to classify for real, especially at the complete_mastery /
 * multi-week tier, so this needs to read as "building your course" rather
 * than a generic spinner.
 */
export default function CourseLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <GlassCard className="space-y-4 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50">
          <Sparkles className="h-6 w-6 animate-pulse text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            Building your course…
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Gemini is planning your roadmap and writing the first lesson. Bigger courses (complete mastery /
            multi-week) can take a couple of minutes.
          </p>
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-2 animate-pulse rounded-full bg-violet-200 dark:bg-violet-900" />
          <div className="h-2 w-4/5 animate-pulse rounded-full bg-violet-200 dark:bg-violet-900" />
          <div className="mx-auto h-2 w-2/3 animate-pulse rounded-full bg-violet-200 dark:bg-violet-900" />
        </div>
      </GlassCard>
    </div>
  );
}
