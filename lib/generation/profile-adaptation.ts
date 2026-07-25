import {
  DEFAULT_LEARNING_ADAPTATION,
  type LearningAdaptation,
  type LessonFormat,
  type UserProfile,
} from "@/types/database";

export type LearningSignal =
  | { kind: "lesson_completed"; format: LessonFormat }
  | { kind: "quiz_finished"; scorePercent: number; questionCount: number };

/**
 * Concrete, actionable profile instructions for Gemini — not a boolean dump.
 * Accommodations are gated on `*.enabled` only (sub-flags alone must never
 * activate a whole accommodation category).
 */
export function buildProfileAdaptationInstructions(profile: UserProfile): string {
  const ls = profile.learning_styles;
  const nd = profile.neurodivergent_accommodations;
  const adapt = profile.learning_adaptation ?? DEFAULT_LEARNING_ADAPTATION;
  const lines: string[] = [
    "LEARNER PROFILE — tailor structure AND content to this specific learner (do not produce a generic one-size-fits-all lesson):",
  ];

  const activeStyles: string[] = [];
  if (ls.visual) {
    activeStyles.push("visual");
    lines.push(
      "- VISUAL: prioritize diagrams, spatial metaphors, color-coded callouts, and rich `visual_hint` on every slide; keep dense paragraphs short.",
    );
  }
  if (ls.auditory) {
    activeStyles.push("auditory");
    lines.push(
      "- AUDITORY: write `spoken_narration` as a natural spoken script (complete sentences, spoken rhythm), slightly longer than on-screen text; include pronunciation guidance where relevant.",
    );
  }
  if (ls.hands_on) {
    activeStyles.push("hands-on");
    lines.push(
      "- HANDS-ON: include at least 2 `interactive_widget` practice slides (match_pairs and/or multiple_choice) with real drills — not optional filler.",
    );
  }
  if (ls.reading_writing) {
    activeStyles.push("reading/writing");
    lines.push(
      "- READING/WRITING: denser precise definitions, short worked examples the learner could rewrite from memory, and a clear takeaway sentence per slide.",
    );
  }
  if (activeStyles.length === 0) {
    lines.push(
      "- No style toggles set — balance visual examples with clear written definitions.",
    );
  } else {
    lines.push(`- Declared styles in force: ${activeStyles.join(", ")}.`);
  }

  const pace = ls.preferred_pace ?? "moderate";
  if (pace === "slow") {
    lines.push(
      "- PACE slow: one idea per slide, extra worked example before advancing, gentle scaffolding, no dense multi-concept dumps.",
    );
  } else if (pace === "fast") {
    lines.push(
      "- PACE fast: denser slides, assume prior knowledge where reasonable, fewer restatements, more advanced applications earlier.",
    );
  } else {
    lines.push("- PACE moderate: clear progression without rushing or over-explaining.");
  }

  if (nd.adhd.enabled) {
    lines.push(
      "- ADHD / micro-learning: VERY short chunks, one idea per slide, scannable bullets (3–5 max), bold the key term, optional break prompt in a callout every few slides. Prefer bite-sized module titles in roadmaps.",
    );
  }
  if (nd.dyscalculia.enabled) {
    lines.push(
      "- DYSCALCULIA: step-by-step math only, visual metaphors for quantities, mention color-coded numbers in `visual_hint` when numbers appear; avoid mixed fraction notation when possible.",
    );
  }
  if (nd.math_anxiety.enabled) {
    lines.push(
      "- MATH ANXIETY: warm encouraging tone, no pressure/timer language, gentle progression, celebrate small wins in callouts; never shame mistakes.",
    );
  }

  // Observed patterns from actual usage (zero Gemini cost to collect).
  if (adapt.lessons_completed >= 2) {
    const ranked = (
      Object.entries(adapt.style_affinity) as [
        keyof typeof adapt.style_affinity,
        number,
      ][]
    )
      .filter(([, v]) => v >= 0.25)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    if (ranked.length > 0) {
      lines.push(
        `- OBSERVED from this learner's app usage (weight these): stronger engagement with ${ranked
          .map(([k, v]) => `${k.replace("_", "/")}~${Math.round(v * 100)}%`)
          .join(", ")}. Lean the format toward those modalities.`,
      );
    }
    if (adapt.preferred_chunk === "micro" || adapt.preferred_chunk === "short") {
      lines.push(
        `- OBSERVED chunk preference: ${adapt.preferred_chunk} — keep lessons tighter than a default curriculum.`,
      );
    }
    if (adapt.quizzes_taken >= 2 && adapt.quiz_correct_rate < 0.55) {
      lines.push(
        "- OBSERVED quiz struggle: add more scaffolding, worked examples, and an easier practice widget before advanced nuance.",
      );
    } else if (adapt.quizzes_taken >= 2 && adapt.quiz_correct_rate > 0.85) {
      lines.push(
        "- OBSERVED strong quiz performance: you may raise difficulty slightly and skip over-explaining basics.",
      );
    }
  }

  lines.push(
    "HARD RULE: the resulting lesson/roadmap must look different for this profile than for a learner with opposite styles/pace — never ignore the bullets above.",
  );

  return lines.join("\n");
}

/** Structural slide-range nudge from profile (applied on top of depth tier). */
export function adjustSlideRangeForProfile(
  base: { min: number; max: number },
  profile: UserProfile,
): { min: number; max: number } {
  let { min, max } = base;
  const nd = profile.neurodivergent_accommodations;
  const pace = profile.learning_styles.preferred_pace ?? "moderate";
  const chunk = profile.learning_adaptation?.preferred_chunk ?? "standard";

  if (nd.adhd.enabled || nd.adhd.micro_learning_mode || chunk === "micro") {
    min = Math.max(3, min - 2);
    max = Math.max(min, max - 2);
  } else if (pace === "slow" || chunk === "short") {
    min = Math.max(4, min - 1);
    max = Math.max(min, max - 1);
  } else if (pace === "fast") {
    min = min + 1;
    max = max + 1;
  }

  return { min, max };
}

/**
 * Pick lesson formats from style prefs so a hands-on learner doesn't get
 * an identical all-slideshow course to a reading/writing learner.
 */
export function pickLessonFormatsForModule(
  lessonsInModule: number,
  profile: UserProfile,
  fallback: LessonFormat = "slideshow",
): LessonFormat[] {
  const ls = profile.learning_styles;
  const adapt = profile.learning_adaptation ?? DEFAULT_LEARNING_ADAPTATION;
  const formats: LessonFormat[] = [];

  // Affinity tips the scale when declared styles are tied/empty.
  const handsOn =
    ls.hands_on || adapt.style_affinity.hands_on >= 0.4;
  const auditory =
    ls.auditory || adapt.style_affinity.auditory >= 0.4;
  const reading =
    ls.reading_writing || adapt.style_affinity.reading_writing >= 0.4;

  if (lessonsInModule <= 1) {
    if (handsOn && !ls.visual && !reading) return ["quiz"];
    if (auditory && !ls.visual && !reading && !handsOn) return ["script"];
    if (reading && !ls.visual && !handsOn) return ["cheat_sheet"];
    return [fallback];
  }

  // Lesson 1: foundations slideshow (or script if strongly auditory-only).
  formats.push(auditory && !ls.visual && !reading ? "script" : "slideshow");

  // Lesson 2: practice modality matched to style.
  if (handsOn) formats.push("quiz");
  else if (reading) formats.push("cheat_sheet");
  else if (auditory) formats.push("script");
  else formats.push("slideshow");

  while (formats.length < lessonsInModule) {
    formats.push(fallback);
  }
  return formats.slice(0, lessonsInModule);
}

export function mergeLearningSignal(
  current: LearningAdaptation | null | undefined,
  signal: LearningSignal,
  profileHints?: { adhdMicro?: boolean; pace?: string },
): LearningAdaptation {
  const next: LearningAdaptation = {
    ...DEFAULT_LEARNING_ADAPTATION,
    ...(current ?? {}),
    style_affinity: {
      ...DEFAULT_LEARNING_ADAPTATION.style_affinity,
      ...(current?.style_affinity ?? {}),
    },
    recent_quiz_scores: [...(current?.recent_quiz_scores ?? [])],
  };

  const decay = 0.85;
  const bump = (key: keyof LearningAdaptation["style_affinity"], amount: number) => {
    next.style_affinity[key] = Math.min(
      1,
      next.style_affinity[key] * decay + amount,
    );
  };

  if (signal.kind === "lesson_completed") {
    next.lessons_completed += 1;
    switch (signal.format) {
      case "slideshow":
        bump("visual", 0.2);
        break;
      case "script":
        bump("auditory", 0.35);
        break;
      case "quiz":
        bump("hands_on", 0.35);
        break;
      case "cheat_sheet":
        bump("reading_writing", 0.35);
        break;
    }
  }

  if (signal.kind === "quiz_finished") {
    next.quizzes_taken += 1;
    next.recent_quiz_scores = [
      ...next.recent_quiz_scores,
      signal.scorePercent,
    ].slice(-8);
    const avg =
      next.recent_quiz_scores.reduce((a, b) => a + b, 0) /
      next.recent_quiz_scores.length;
    next.quiz_correct_rate = avg / 100;
    bump("hands_on", 0.15);
  }

  if (profileHints?.adhdMicro) {
    next.preferred_chunk = "micro";
  } else if (profileHints?.pace === "slow") {
    next.preferred_chunk = "short";
  } else if (next.lessons_completed >= 3 && next.quiz_correct_rate > 0 && next.quiz_correct_rate < 0.5) {
    next.preferred_chunk = "short";
  } else if (profileHints?.pace === "fast") {
    next.preferred_chunk = "standard";
  }

  next.updated_at = new Date().toISOString();
  return next;
}
