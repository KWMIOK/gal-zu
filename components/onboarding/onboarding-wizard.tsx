"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Calculator, CheckCircle2 } from "lucide-react";

import { saveOnboardingPreferences } from "@/app/actions/onboarding";
import { useT } from "@/components/preferences/learner-prefs-provider";
import {
  AnimatedMultiSelect,
  AnimatedSelect,
} from "@/components/ui/animated-select";
import { GlassCard } from "@/components/ui/glass-card";
import {
  FONT_STYLE_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/preferences/language-font";
import {
  DEFAULT_FONT_STYLE,
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  DEFAULT_PREFERRED_LANGUAGE,
  type FontStyle,
  type LearningStyles,
  type NeurodivergentAccommodations,
  type PreferredLanguage,
} from "@/types/database";

type StyleKey = Exclude<keyof LearningStyles, "preferred_pace">;

export function OnboardingWizard({
  mode = "onboarding",
  initialLearningStyles,
  initialAccommodations,
  initialPreferredLanguage,
  initialFontStyle,
}: {
  mode?: "onboarding" | "settings";
  initialLearningStyles?: LearningStyles;
  initialAccommodations?: NeurodivergentAccommodations;
  initialPreferredLanguage?: PreferredLanguage;
  initialFontStyle?: FontStyle;
}) {
  const router = useRouter();
  const t = useT();
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
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>(
    initialPreferredLanguage ?? DEFAULT_PREFERRED_LANGUAGE,
  );
  const [fontStyle, setFontStyle] = useState<FontStyle>(
    initialFontStyle ?? DEFAULT_FONT_STYLE,
  );

  const styleOptions: { value: StyleKey; label: string }[] = [
    { value: "visual", label: t("prefs.style.visual") },
    { value: "auditory", label: t("prefs.style.auditory") },
    { value: "hands_on", label: t("prefs.style.hands_on") },
    { value: "reading_writing", label: t("prefs.style.reading_writing") },
  ];

  const paceOptions: {
    value: NonNullable<LearningStyles["preferred_pace"]>;
    label: string;
    hint: string;
  }[] = [
    {
      value: "slow",
      label: t("prefs.pace.slow"),
      hint: t("prefs.pace.slowHint"),
    },
    {
      value: "moderate",
      label: t("prefs.pace.moderate"),
      hint: t("prefs.pace.moderateHint"),
    },
    {
      value: "fast",
      label: t("prefs.pace.fast"),
      hint: t("prefs.pace.fastHint"),
    },
  ];

  const languageOptions = PREFERRED_LANGUAGE_OPTIONS.map((option) => ({
    value: option.value,
    label: `${option.label} · ${option.nativeLabel}`,
  }));

  const fontOptions = FONT_STYLE_OPTIONS.map((option) => ({
    value: option.value,
    label: t(
      option.value === "standard_clean"
        ? "prefs.font.standard_clean"
        : option.value === "dyslexia_support"
          ? "prefs.font.dyslexia_support"
          : "prefs.font.max_legibility",
    ),
    hint: t(
      option.value === "standard_clean"
        ? "prefs.font.standard_cleanHint"
        : option.value === "dyslexia_support"
          ? "prefs.font.dyslexia_supportHint"
          : "prefs.font.max_legibilityHint",
    ),
  }));

  function selectedStyleKeys(styles: LearningStyles): StyleKey[] {
    return styleOptions
      .map((option) => option.value)
      .filter((key) => styles[key] === true);
  }

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
        preferred_language: preferredLanguage,
        font_style: fontStyle,
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
          {t("prefs.title")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">{t("prefs.subtitle")}</p>
      </div>

      <GlassCard className="space-y-6 p-6">
        <section className="space-y-3">
          <AnimatedSelect
            value={preferredLanguage}
            onChange={(value) => {
              setSaved(false);
              setPreferredLanguage(value);
            }}
            disabled={pending}
            aria-label={t("prefs.preferredLanguage")}
            placeholder={t("prefs.preferredLanguage")}
            keepPlaceholder
            className="max-w-none"
            options={languageOptions}
          />
          <AnimatedSelect
            value={fontStyle}
            onChange={(value) => {
              setSaved(false);
              setFontStyle(value);
            }}
            disabled={pending}
            aria-label={t("prefs.fontStyle")}
            placeholder={t("prefs.fontStyle")}
            keepPlaceholder
            className="max-w-none"
            options={fontOptions}
          />
          <AnimatedMultiSelect
            values={selectedStyleKeys(learningStyles)}
            onChange={setSelectedStyles}
            disabled={pending}
            aria-label={t("prefs.learningStyles")}
            placeholder={t("prefs.learningStyles")}
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
            aria-label={t("prefs.learningPace")}
            placeholder={t("prefs.learningPace")}
            keepPlaceholder
            className="max-w-none"
            options={paceOptions}
          />
        </section>

        <section className="space-y-3 border-t border-zinc-200/80 pt-6 dark:border-zinc-700/80">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <Calculator className="h-4 w-4" /> {t("prefs.accessibilities")}
          </h2>

          <ToggleRow
            label={t("prefs.adhd")}
            description={t("prefs.adhdDesc")}
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
            label={t("prefs.dyscalculia")}
            description={t("prefs.dyscalculiaDesc")}
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
            label={t("prefs.mathAnxiety")}
            description={t("prefs.mathAnxietyDesc")}
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
                  optional_hints_default: checked,
                },
              }));
            }}
          />

          <ToggleRow
            label={t("prefs.dyslexia")}
            description={t("prefs.dyslexiaDesc")}
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
            label={t("prefs.dysgraphia")}
            description={t("prefs.dysgraphiaDesc")}
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
            label={t("prefs.nvld")}
            description={t("prefs.nvldDesc")}
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
            label={t("prefs.apd")}
            description={t("prefs.apdDesc")}
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
            {t("prefs.saved")}
          </p>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
        >
          {pending
            ? t("prefs.saving")
            : mode === "settings"
              ? t("prefs.save")
              : t("prefs.continue")}
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
