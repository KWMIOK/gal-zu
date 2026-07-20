"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BookOpen,
  Clock,
  Compass,
  GraduationCap,
  Loader2,
  Sparkles,
  Sprout,
  Zap,
} from "lucide-react";

import { createCourseFromPrompt } from "@/app/actions/generation";
import { PLAN_TIERS } from "@/lib/billing/tiers";
import {
  type CreateCourseFromPromptOptions,
  type PromptDepth,
  type PromptSessionLength,
} from "@/lib/generation/create-course";
import {
  isCapReachedMessage,
  stripCapReachedPrefix,
  type QuotaSummary,
} from "@/lib/generation/quota-shared";
import { GlassCard } from "@/components/ui/glass-card";

const depthOptions: {
  id: PromptDepth;
  label: string;
  icon: typeof Zap;
  hint: string;
}[] = [
  {
    id: "quick_answer",
    label: "Quick answer",
    icon: Zap,
    hint: "One focused lesson, right now.",
  },
  {
    id: "overview",
    label: "Overview",
    icon: Compass,
    hint: "A short guided tour — a few lessons.",
  },
  {
    id: "deep_dive",
    label: "Deep dive",
    icon: BookOpen,
    hint: "A proper multi-module course.",
  },
  {
    id: "complete_mastery",
    label: "Complete mastery",
    icon: GraduationCap,
    hint: "The full curriculum — as many modules as the topic really needs.",
  },
];

const sessionOptions: {
  id: PromptSessionLength;
  label: string;
}[] = [
  { id: "5min", label: "5 min" },
  { id: "20min", label: "20 min" },
  { id: "multi_week", label: "Multi-week" },
];

export function OmniPromptBar({
  initialQuota,
}: {
  initialQuota?: QuotaSummary | null;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [depth, setDepth] = useState<PromptDepth>("quick_answer");
  const [sessionLength, setSessionLength] =
    useState<PromptSessionLength>("20min");
  const [error, setError] = useState<string | null>(null);
  const [capReached, setCapReached] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCapReached(false);

    const options: CreateCourseFromPromptOptions = {
      depth,
      sessionLength,
    };

    startTransition(async () => {
      try {
        const result = await createCourseFromPrompt(prompt, options);
        router.push(
          `/courses/${result.courseId}/lessons/${result.firstLessonId}`,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        if (isCapReachedMessage(message)) {
          setCapReached(true);
          setError(stripCapReachedPrefix(message));
        } else {
          setError(message);
        }
      }
    });
  }

  return (
    <GlassCard className="relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
      <form onSubmit={handleSubmit} className="relative space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            What do you want to learn today?
          </label>
          {initialQuota ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                initialQuota.remaining <= 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <Sprout className="h-3.5 w-3.5" />
              {initialQuota.remaining} of {initialQuota.limit} lessons left today
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Try "1+1", Quantum mechanics, or Japanese greetings…'
            className="flex-1 rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-zinc-900 shadow-inner outline-none ring-violet-500/30 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-50"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !prompt.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Learn
              </>
            )}
          </button>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <GraduationCap className="h-3.5 w-3.5" /> Depth
          </p>
          <div className="flex flex-wrap gap-2">
            {depthOptions.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                disabled={pending}
                onClick={() => setDepth(id)}
                title={depthOptions.find((d) => d.id === id)?.hint}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
                  depth === id
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {depthOptions.find((d) => d.id === depth)?.hint}
          </p>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <Clock className="h-3.5 w-3.5" /> Session
          </p>
          <div className="flex flex-wrap gap-2">
            {sessionOptions.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                disabled={pending}
                onClick={() => setSessionLength(id)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  sessionLength === id
                    ? "bg-fuchsia-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && capReached ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {error}
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
        ) : error ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950/5 p-3 font-mono text-xs leading-relaxed text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </pre>
        ) : null}

        {pending ? (
          <div className="space-y-2 rounded-xl border border-violet-200/50 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
            <div className="h-2 animate-pulse rounded-full bg-violet-200 dark:bg-violet-900" />
            <div className="h-2 w-4/5 animate-pulse rounded-full bg-violet-200 dark:bg-violet-900" />
            <p className="text-sm text-violet-700 dark:text-violet-300">
              {depth === "quick_answer"
                ? "Building your lesson deck…"
                : "Building your roadmap and the first lesson (this may take a minute)… the rest of the course fills in as you go."}
            </p>
          </div>
        ) : null}
      </form>
    </GlassCard>
  );
}
