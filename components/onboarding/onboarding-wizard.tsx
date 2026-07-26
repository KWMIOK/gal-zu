"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Calculator, CheckCircle2 } from "lucide-react";

import { saveOnboardingPreferences } from "@/app/actions/onboarding";
import {
  AnimatedMultiSelect,
  AnimatedSelect,
} from "@/components/ui/animated-select";
import { GlassCard } from "@/components/ui/glass-card";
import {
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  type LearningStyles,
  type NeurodivergentAccommodations,
} from "@/types/database";

type StyleKey = Exclude<keyof LearningStyles, "preferred_pace">;

const styleOptions: { value: StyleKey; label: string }[] = [
  { value: "visual", label: "Visual" },
  { value: "auditory", label: "Auditory" },
  { value: "hands_on", label: "Hands-on" },
  { value: "reading_writing", label: "Reading / writing" },
];

const paceOptions: {
  value: NonNullable<LearningStyles["preferred_pace"]>;
  label: string;
  hint: string;
}[] = [
  {
    value: "slow",
    label: "Slow & steady",
    hint: "More slides, gentler progression.",
  },
  {
    value: "moderate",
    label: "Moderate",
    hint: "Balanced pacing for most topics.",
  },
  {
    value: "fast",
    label: "Fast",
    hint: "Denser lessons, fewer pauses.",
  },
];

function selectedStyleKeys(styles: LearningStyles): StyleKey[] {
  return styleOptions
    .map((option) => option.value)
    .filter((key) => styles[key] === true);
}

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

  function setSelectedStyles(keys: StyleKey[]) {
    setSaved(false);
    setLearningStyles((prev) => {
      const next = { ...prev };
      for (const option of styleOptions) {
        next[option.value] = keys.includes(option.value);
      }
      return next;
    });
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
        <h1 className="text-3xl font-semibold tracking-tight">
          Tune your learning experience
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          These shape every new course and lesson — slide length, lesson
          formats (quiz vs slides vs script), tone, and accessibilities. The
          app also learns from how you use it and refines later lessons
          (no extra AI cost for that).
        </p>
      </div>

      <GlassCard className="space-y-6 p-6">
        <section className="space-y-3">
          <AnimatedMultiSelect
            values={selectedStyleKeys(learningStyles)}
            onChange={setSelectedStyles}
            disabled={pending}
            aria-label="Learning styles"
            placeholder="Learning styles"
            keepPlaceholder
            className="max-w-none"
            options={styleOptions}
          />
          <AnimatedSelect
            value={learningStyles.preferred_pace ?? "moderate"}
            onChange={(pace) => {
              setSaved(false);
              setLearningStyles((prev) => ({
                ...prev,
                preferred_pace: pace,
              }));
            }}
            disabled={pending}
            aria-label="Learning pace"
            placeholder="Learning pace"
            keepPlaceholder
            className="max-w-none"
            options={paceOptions}
          />
        </section>

        <section className="space-y-3 border-t border-zinc-200/80 pt-6 dark:border-zinc-700/80">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <Calculator className="h-4 w-4" /> Accessibilities
          </h2>

          <ToggleRow
            label="ADHD micro-learning mode"
            description="Shorter slides, fewer distractions, break prompts."
            checked={accommodations.adhd.enabled}
            onChange={(checked) => {
              setSaved(false);
              setAccommodations((prev) => ({
                ...prev,
                adhd: {
                  ...prev.adhd,
                  enabled: checked,
                  micro_learning_mode: checked,
                  frequent_break_prompts: checked,
                  reduced_distractions: checked,
                },
              }));
            }}
          />

          <ToggleRow
            label="Dyscalculia supports"
            description="Visual math aids, step-by-step breakdowns, color-coded numbers."
            checked={accommodations.dyscalculia.enabled}
            onChange={(checked) => {
              setSaved(false);
              setAccommodations((prev) => ({
                ...prev,
                dyscalculia: {
                  ...prev.dyscalculia,
                  enabled: checked,
                  visual_math_aids: checked,
                  step_by_step_breakdown: checked,
                  color_coded_numbers: checked,
                  avoid_mixed_fraction_notation: checked,
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
                  gentle_progression: checked,
                  hide_timers: checked,
                  encouragement_prompts: checked,
                },
              }));
            }}
          />

          <ToggleRow
            label="Disorders of Reading (Dyslexia)"
            description="Shorter sentences, spaced layout, phonetic guides, strong visuals."
            checked={accommodations.dyslexia.enabled}
            onChange={(checked) => {
              setSaved(false);
              setAccommodations((prev) => ({
                ...prev,
                dyslexia: {
                  ...prev.dyslexia,
                  enabled: checked,
                  simplified_language: checked,
                  spaced_layout: checked,
                  phonetic_supports: checked,
                },
              }));
            }}
          />

          <ToggleRow
            label="Disorders of Written Expression (Dysgraphia)"
            description="Less writing load — prefer selection and matching practice."
            checked={accommodations.dysgraphia.enabled}
            onChange={(checked) => {
              setSaved(false);
              setAccommodations((prev) => ({
                ...prev,
                dysgraphia: {
                  ...prev.dysgraphia,
                  enabled: checked,
                  minimize_writing_load: checked,
                  prefer_selection_tasks: checked,
                },
              }));
            }}
          />

          <ToggleRow
            label="Nonverbal Learning Disability (NVLD)"
            description="Explicit verbal steps; less figurative or diagram-only teaching."
            checked={accommodations.nvld.enabled}
            onChange={(checked) => {
              setSaved(false);
              setAccommodations((prev) => ({
                ...prev,
                nvld: {
                  ...prev.nvld,
                  enabled: checked,
                  explicit_verbal_instruction: checked,
                  reduce_figurative_language: checked,
                },
              }));
            }}
          />

          <ToggleRow
            label="Auditory Processing Disorder (APD)"
            description="Full on-screen text; slow, clear narration that matches the slides."
            checked={accommodations.apd.enabled}
            onChange={(checked) => {
              setSaved(false);
              setAccommodations((prev) => ({
                ...prev,
                apd: {
                  ...prev.apd,
                  enabled: checked,
                  written_reinforcement: checked,
                  slow_clear_narration: checked,
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
            Preferences saved — new courses and ungenerated lessons will use
            these settings.
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
