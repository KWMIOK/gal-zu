"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Sparkles, Sprout } from "lucide-react";

import { createCourseFromPrompt } from "@/app/actions/generation";
import { PaidDepthGateDialog } from "@/components/billing/paid-depth-gate-dialog";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { GlassCard } from "@/components/ui/glass-card";
import {
  isDepthLockedMessage,
  isPaidPromptDepth,
  stripDepthLockedPrefix,
} from "@/lib/billing/depth-access";
import { PLAN_TIERS } from "@/lib/billing/tiers";
import {
  type CreateCourseFromPromptOptions,
  type PromptDepth,
} from "@/lib/generation/create-course";
import {
  isCapReachedMessage,
  stripCapReachedPrefix,
  type QuotaSummary,
} from "@/lib/generation/quota-shared";

const depthOptions: {
  id: PromptDepth;
  label: string;
  hint: string;
  paid?: boolean;
}[] = [
  {
    id: "quick_answer",
    label: "Quick answer",
    hint: "One focused lesson, right now.",
  },
  {
    id: "overview",
    label: "Overview",
    hint: "A short guided tour — a few lessons.",
  },
  {
    id: "deep_dive",
    label: "Deep dive",
    hint: "A proper multi-module course.",
    paid: true,
  },
  {
    id: "complete_mastery",
    label: "Complete mastery",
    hint: "The full curriculum — as many modules as the topic really needs.",
    paid: true,
  },
];

export function OmniPromptBar({
  initialQuota,
  canUsePaidDepths = false,
}: {
  initialQuota?: QuotaSummary | null;
  /** True only for Pro entitlements — never true for guests or free accounts. */
  canUsePaidDepths?: boolean;
}) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [depth, setDepth] = useState<PromptDepth | "">("");
  const [error, setError] = useState<string | null>(null);
  const [capReached, setCapReached] = useState(false);
  const [depthLocked, setDepthLocked] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateLabel, setGateLabel] = useState("Deep dive");
  const [pending, startTransition] = useTransition();

  const selectedHint =
    depth === ""
      ? null
      : depthOptions.find((d) => d.id === depth)?.hint ?? null;

  function handleDepthChange(id: PromptDepth) {
    const option = depthOptions.find((d) => d.id === id);
    if (option?.paid && !canUsePaidDepths) {
      setGateLabel(option.label);
      setGateOpen(true);
      return;
    }
    setDepth(id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCapReached(false);
    setDepthLocked(false);

    if (!depth) {
      setError("Choose a depth before starting.");
      return;
    }

    if (isPaidPromptDepth(depth) && !canUsePaidDepths) {
      const option = depthOptions.find((d) => d.id === depth);
      setGateLabel(option?.label ?? "This depth");
      setGateOpen(true);
      return;
    }

    const options: CreateCourseFromPromptOptions = { depth };

    startTransition(async () => {
      try {
        const result = await createCourseFromPrompt(prompt, options);
        router.push(`/courses/${result.courseId}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        if (isCapReachedMessage(message)) {
          setCapReached(true);
          setError(stripCapReachedPrefix(message));
        } else if (isDepthLockedMessage(message)) {
          setDepthLocked(true);
          setError(stripDepthLockedPrefix(message));
          setGateOpen(true);
        } else {
          setError(message);
        }
      }
    });
  }

  return (
    <>
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
                {initialQuota.remaining} of {initialQuota.limit} lessons left
                today
              </span>
            ) : !isSignedIn ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Free · Quick answer & Overview unlimited
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
              disabled={pending || !prompt.trim() || !depth}
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
            <AnimatedSelect
              value={depth}
              onChange={handleDepthChange}
              disabled={pending}
              aria-label="Depth"
              placeholder="Depth"
              options={depthOptions.map(({ id, label, hint, paid }) => ({
                value: id,
                label,
                hint,
                locked: Boolean(paid && !canUsePaidDepths),
                lockedBadge: "Pro",
              }))}
            />
            {selectedHint ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedHint}
              </p>
            ) : null}
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
                    {PLAN_TIERS.pro.dailyLessonLimit} lessons/day ·{" "}
                    {PLAN_TIERS.pro.tagline}
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
          ) : error && !depthLocked ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950/5 p-3 font-mono text-xs leading-relaxed text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </pre>
          ) : null}

          {pending ? (
            <div className="space-y-2 rounded-xl border border-violet-200/50 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
              <div className="h-2 animate-pulse rounded-full bg-violet-200 dark:bg-violet-900" />
              <div className="h-2 w-4/5 animate-pulse rounded-full bg-violet-200 dark:bg-violet-900" />
              <p className="text-sm text-violet-700 dark:text-violet-300">
                Creating your course…
              </p>
            </div>
          ) : null}
        </form>
      </GlassCard>

      <PaidDepthGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        isAnonymous={!isSignedIn}
        depthLabel={gateLabel}
      />
    </>
  );
}
