"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { PLAN_TIERS } from "@/lib/billing/tiers";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Shown from the course page whenever `ensureCourseClassified` couldn't
 * hand back a `ready` course yet — either it's still genuinely in
 * progress (`building`), the learner is out of daily quota
 * (`cap_reached`), or classification failed after every model/retry
 * attempt (`failed`). No silent fallback roadmap here either — same
 * philosophy as `LessonBlockedView`: a real problem should be visible and
 * retryable, not masked as an empty "no lessons yet" course.
 */
export function CourseStatusView({
  reason,
  message,
}: {
  reason: "building" | "cap_reached" | "failed";
  message?: string;
}) {
  const router = useRouter();

  return (
    <GlassCard className="space-y-4 p-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-violet-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      {reason === "building" ? (
        <div className="space-y-3 rounded-xl border border-violet-200/50 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
          <p className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Still building your roadmap and first lesson…
          </p>
          <p className="text-xs text-violet-700/80 dark:text-violet-300/80">
            Bigger courses (complete mastery / multi-week) can take a couple of minutes. This page will pick up
            automatically once it&apos;s ready.
          </p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Check again
          </button>
        </div>
      ) : reason === "cap_reached" ? (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            {message ?? "You've hit today's generation limit."}
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
            This course hasn&apos;t been built yet — it&apos;ll build automatically once your quota resets, or right
            away on {PLAN_TIERS.pro.name}.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/60 p-3 dark:bg-zinc-900/40">
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {PLAN_TIERS.pro.name} — {PLAN_TIERS.pro.priceLabel}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {PLAN_TIERS.pro.dailyLessonLimit} lessons/day · {PLAN_TIERS.pro.tagline}
              </p>
            </div>
            <button
              type="button"
              disabled
              title="Subscriptions aren't live yet — this button isn't wired up to a real purchase."
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-amber-600/40 px-3 py-1.5 text-sm font-semibold text-white opacity-70"
            >
              <Sparkles className="h-3.5 w-3.5" /> Upgrade (coming soon)
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
            <AlertTriangle className="h-4 w-4" />
            Couldn&apos;t build this course — every model/retry attempt failed.
          </p>
          {message ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950/90 p-3 font-mono text-[11px] leading-relaxed text-red-100">
              {message}
            </pre>
          ) : (
            <p className="text-xs text-red-700/80 dark:text-red-300/80">
              No error detail was captured — check the server logs for this course&apos;s classification attempt.
            </p>
          )}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}
    </GlassCard>
  );
}
