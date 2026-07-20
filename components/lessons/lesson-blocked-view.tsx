"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";

import { PLAN_TIERS } from "@/lib/billing/tiers";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Shown from the lesson page when `ensureLessonGenerated` couldn't produce
 * content for this lesson yet — either the learner is out of daily quota
 * (`cap_reached`), or generation genuinely failed after every model/retry
 * attempt (`failed`). There is deliberately no silent placeholder fallback
 * anymore (see lib/gemini.ts) — `message` here is the *real* underlying
 * error (which model(s) failed, why, schema mismatch vs API error, etc.),
 * shown verbatim so a real problem is visible and fixable instead of
 * masked behind generic filler content.
 */
export function LessonBlockedView({
  courseId,
  reason,
  message,
}: {
  courseId: string;
  reason: "cap_reached" | "failed";
  message?: string;
}) {
  const router = useRouter();

  return (
    <GlassCard className="space-y-4 p-6">
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-violet-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back to roadmap
      </Link>

      {reason === "cap_reached" ? (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            {message ?? "You've hit today's generation limit."}
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
            This lesson hasn&apos;t been generated yet — it&apos;ll build automatically once your quota resets, or
            right away on {PLAN_TIERS.pro.name}.
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
            Couldn&apos;t generate this lesson — every model/retry attempt failed.
          </p>
          {message ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950/90 p-3 font-mono text-[11px] leading-relaxed text-red-100">
              {message}
            </pre>
          ) : (
            <p className="text-xs text-red-700/80 dark:text-red-300/80">
              No error detail was captured — check the server logs for this lesson&apos;s generation attempt.
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
