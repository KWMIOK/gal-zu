"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Brain, Calculator, CheckCircle2, Sparkles } from "lucide-react";

import { saveOnboardingPreferences } from "@/app/actions/onboarding";
import { GlassCard } from "@/components/ui/glass-card";
import {
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  type LearningStyles,
  type NeurodivergentAccommodations,
} from "@/types/database";

const styleOptions: { key: keyof LearningStyles; label: string }[] = [
  { key: "visual", label: "Visual" },
  { key: "auditory", label: "Auditory" },
  { key: "hands_on", label: "Hands-on" },
  { key: "reading_writing", label: "Reading / writing" },
];

export function OnboardingWizard({
  mode = "onboarding",
  initialLearningStyles,
  initialAccommodations,
}: {
  mode?: "onboarding" | "settings";
  initialLearningStyles?: LearningStyles;
  initialAccommodations?: NeurodivergentAccommodations;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [learningStyles, setLearningStyles] = useState<LearningStyles>(
    initialLearningStyles ?? { ...DEFAULT_LEARNING_STYLES },
  );
  const [accommodations, setAccommodations] =
    useState<NeurodivergentAccommodations>(
      initialAccommodations ?? { ...DEFAULT_NEURODIVERGENT_ACCOMMODATIONS },
    );

  function toggleStyle(key: keyof LearningStyles) {
    if (key === "preferred_pace") return;
    setLearningStyles((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await saveOnboardingPreferences({
        learning_styles: learningStyles,
        neurodivergent_accommodations: accommodations,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSaved(true);
      router.refresh();

      if (mode === "onboarding") {
        router.push("/dashboard");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="space-y-2 text-center">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400">
          <Sparkles className="h-4 w-4" />{" "}
          {mode === "settings" ? "Learning preferences" : "Welcome to Gal-zu"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Tune your learning experience
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Saved preferences are loaded into every Gemini roadmap and lesson
          (slide length, tone, ADHD/dyscalculia/math-anxiety adaptations).
        </p>
      </div>

      <GlassCard className="space-y-6 p-6">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <Brain className="h-4 w-4" /> Learning styles
          </h2>
          <div className="flex flex-wrap gap-2">
            {styleOptions.map(({ key, label }) => {
              const active = learningStyles[key] === true;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleStyle(key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <label className="mt-4 block text-sm text-zinc-600 dark:text-zinc-400">
            Preferred pace
            <select
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={learningStyles.preferred_pace ?? "moderate"}
              onChange={(e) => {
                setSaved(false);
                setLearningStyles((prev) => ({
                  ...prev,
                  preferred_pace: e.target
                    .value as LearningStyles["preferred_pace"],
                }));
              }}
            >
              <option value="slow">Slow & steady</option>
              <option value="moderate">Moderate</option>
              <option value="fast">Fast</option>
            </select>
          </label>
        </section>

        <section className="space-y-3 border-t border-zinc-200/80 pt-6 dark:border-zinc-700/80">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <Calculator className="h-4 w-4" /> Accommodations
          </h2>

          <ToggleRow
            label="ADHD micro-learning mode"
            description="Shorter slides, fewer distractions, break prompts."
            checked={accommodations.adhd.micro_learning_mode}
            onChange={(checked) => {
              setSaved(false);
              setAccommodations((prev) => ({
                ...prev,
                adhd: {
                  ...prev.adhd,
                  enabled: checked,
                  micro_learning_mode: checked,
                },
              }));
            }}
          />

          <ToggleRow
            label="Dyscalculia color-coded numbers"
            description="Visual math aids and step-by-step breakdowns."
            checked={accommodations.dyscalculia.color_coded_numbers ?? false}
            onChange={(checked) => {
              setSaved(false);
              setAccommodations((prev) => ({
                ...prev,
                dyscalculia: {
                  ...prev.dyscalculia,
                  enabled: checked,
                  visual_math_aids: true,
                  step_by_step_breakdown: true,
                  color_coded_numbers: checked,
                },
              }));
            }}
          />

          <ToggleRow
            label="Math anxiety low-pressure mode"
            description="Gentle progression, encouragement, no timers."
            checked={accommodations.math_anxiety.enabled}
            onChange={(checked) => {
              setSaved(false);
              setAccommodations((prev) => ({
                ...prev,
                math_anxiety: {
                  ...prev.math_anxiety,
                  enabled: checked,
                  gentle_progression: true,
                  hide_timers: checked,
                  encouragement_prompts: checked,
                },
              }));
            }}
          />
        </section>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {saved && mode === "settings" ? (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Preferences saved — new courses will use these settings.
          </p>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : mode === "settings"
              ? "Save preferences"
              : "Continue to dashboard"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </GlassCard>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-zinc-50/80 p-4 dark:bg-zinc-950/50">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
