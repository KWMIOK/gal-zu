"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Clock,
  GraduationCap,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";

import { createCourseFromPrompt } from "@/app/actions/generation";
import {
  type CreateCourseFromPromptOptions,
  type PromptDepth,
  type PromptSessionLength,
} from "@/lib/generation/create-course";
import { GlassCard } from "@/components/ui/glass-card";

const depthOptions: { id: PromptDepth; label: string; icon: typeof Zap }[] = [
  { id: "quick_answer", label: "Quick answer", icon: Zap },
  { id: "complete_mastery", label: "Complete mastery", icon: GraduationCap },
];

const sessionOptions: {
  id: PromptSessionLength;
  label: string;
}[] = [
  { id: "5min", label: "5 min" },
  { id: "20min", label: "20 min" },
  { id: "multi_week", label: "Multi-week" },
];

export function OmniPromptBar() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [depth, setDepth] = useState<PromptDepth>("quick_answer");
  const [sessionLength, setSessionLength] =
    useState<PromptSessionLength>("20min");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
        setError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      }
    });
  }

  return (
    <GlassCard className="relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
      <form onSubmit={handleSubmit} className="relative space-y-4">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          What do you want to learn today?
        </label>
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

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        {pending ? (
          <div className="space-y-2 rounded-xl border border-violet-200/50 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
            <div className="h-2 animate-pulse rounded-full bg-violet-200 dark:bg-violet-900" />
            <div className="h-2 w-4/5 animate-pulse rounded-full bg-violet-200 dark:bg-violet-900" />
            <p className="text-sm text-violet-700 dark:text-violet-300">
              {depth === "complete_mastery"
                ? "Building your full roadmap and generating all lessons (this may take a minute)…"
                : "Building your lesson deck…"}
            </p>
          </div>
        ) : null}
      </form>
    </GlassCard>
  );
}
