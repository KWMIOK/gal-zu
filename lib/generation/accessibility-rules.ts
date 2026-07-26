import {
  DEFAULT_LEARNING_ADAPTATION,
  type PreferredPace,
  type UserProfile,
} from "@/types/database";

/**
 * Structural overrides resolved from pace + learning styles + accessibility
 * support modes *before* any Gemini call. Higher-priority support modes win
 * conflicts (e.g. ADHD micro-learning overrides "fast" density).
 */
export type AccessibilityStructuralOverrides = {
  /** Short paragraphs, micro-checkpoints, immediate feedback loops. */
  adhdMicroLearning: boolean;
  /** Clean scannable bullets, short sentences, clear hierarchy — no dense prose. */
  scannableBulletLayout: boolean;
  /** Frame math/logic via conceptual/visual-spatial analogies; zero-penalty trials. */
  conceptualMathFraming: boolean;
  /** Prioritize on-screen text clarity; never assume audio reliance. */
  textFirstNoAudioReliance: boolean;
  /** Explicit verbal numbered steps; avoid diagram-only / figurative teaching. */
  explicitVerbalSteps: boolean;
  /** Prefer selection/match practice over free-form writing. */
  minimizeWritingLoad: boolean;
  /** Pace after conflict resolution (ADHD can force slower effective chunking). */
  effectivePace: PreferredPace;
  /** Human-readable notes about which conflicts were resolved. */
  conflictNotes: string[];
};

export type CognitiveProfileResolution = {
  styles: string[];
  pace: PreferredPace;
  supports: string[];
  overrides: AccessibilityStructuralOverrides;
};

/**
 * Pre-process the learner profile: evaluate combinations of pace + support
 * modes and emit structural overrides Gemini (and slide/format planners) must
 * honor. Support-mode safety always outranks pace density preferences.
 */
export function resolveCognitiveProfile(
  profile: UserProfile,
): CognitiveProfileResolution {
  const ls = profile.learning_styles;
  const nd = profile.neurodivergent_accommodations;
  const declaredPace: PreferredPace = ls.preferred_pace ?? "moderate";
  const conflictNotes: string[] = [];

  const styles: string[] = [];
  if (ls.visual) styles.push("visual");
  if (ls.auditory) styles.push("auditory");
  if (ls.hands_on) styles.push("hands-on");
  if (ls.reading_writing) styles.push("reading/writing");

  const supports: string[] = [];
  if (nd.adhd.enabled) supports.push("ADHD micro-learning");
  if (nd.dyscalculia.enabled) supports.push("Dyscalculia supports");
  if (nd.math_anxiety.enabled) supports.push("Math anxiety low-pressure");
  if (nd.dyslexia.enabled) supports.push("Dyslexia (reading)");
  if (nd.dysgraphia.enabled) supports.push("Dysgraphia (written expression)");
  if (nd.nvld.enabled) supports.push("NVLD");
  if (nd.apd.enabled) supports.push("APD");

  const adhdMicroLearning = nd.adhd.enabled || nd.adhd.micro_learning_mode;
  const scannableBulletLayout = nd.dyslexia.enabled || nd.dysgraphia.enabled;
  const conceptualMathFraming =
    nd.dyscalculia.enabled || nd.math_anxiety.enabled;
  const textFirstNoAudioReliance = nd.apd.enabled;
  const explicitVerbalSteps = nd.nvld.enabled;
  const minimizeWritingLoad = nd.dysgraphia.enabled;

  let effectivePace = declaredPace;
  if (adhdMicroLearning && declaredPace === "fast") {
    effectivePace = "moderate";
    conflictNotes.push(
      "ADHD micro-learning overrides fast pace density — keep short chunks with immediate checkpoints (moderate effective pace).",
    );
  }
  if (
    (nd.math_anxiety.enabled || nd.dyslexia.enabled) &&
    declaredPace === "fast"
  ) {
    if (effectivePace === "fast") effectivePace = "moderate";
    conflictNotes.push(
      "Reading supports / math anxiety override rushing — no dense dumps even if pace was fast.",
    );
  }
  if (scannableBulletLayout && ls.reading_writing) {
    conflictNotes.push(
      "Dyslexia/dysgraphia override dense reading/writing prose — use scannable bullets instead of long paragraphs.",
    );
  }
  if (textFirstNoAudioReliance && ls.auditory) {
    conflictNotes.push(
      "APD + auditory style: keep spoken_narration but mirror every point in on-screen text; never audio-only.",
    );
  }
  if (explicitVerbalSteps && ls.visual) {
    conflictNotes.push(
      "NVLD + visual style: diagrams must be fully explained in plain numbered language — never diagram-only.",
    );
  }

  return {
    styles,
    pace: declaredPace,
    supports,
    overrides: {
      adhdMicroLearning,
      scannableBulletLayout,
      conceptualMathFraming,
      textFirstNoAudioReliance,
      explicitVerbalSteps,
      minimizeWritingLoad,
      effectivePace,
      conflictNotes,
    },
  };
}

/**
 * Multi-dimensional system-prompt block: styles, pace, and every active
 * support mode combined into one prioritized instruction set for Gemini.
 */
export function buildCognitiveProfileSystemBlock(profile: UserProfile): string {
  const resolution = resolveCognitiveProfile(profile);
  const { styles, pace, supports, overrides } = resolution;
  const adapt = profile.learning_adaptation ?? DEFAULT_LEARNING_ADAPTATION;
  const ls = profile.learning_styles;
  const sections: string[] = [];

  sections.push(
    [
      "=== COGNITIVE PROFILE (mandatory — shapes structure AND content) ===",
      `Active learning styles: ${styles.length ? styles.join(", ") : "balanced (none toggled)"}.`,
      `Declared pace: ${pace}. Effective pace after conflict resolution: ${overrides.effectivePace}.`,
      `Active accessibilities / support modes: ${supports.length ? supports.join(", ") : "none"}.`,
      overrides.conflictNotes.length
        ? `Conflict resolutions:\n${overrides.conflictNotes.map((n) => `  • ${n}`).join("\n")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const styleLines: string[] = ["[LEARNING STYLES]"];
  if (ls.visual) {
    styleLines.push(
      "- VISUAL: prioritize diagrams, spatial metaphors, color-coded callouts, rich `visual_hint` on every slide; keep prose short.",
    );
  }
  if (ls.auditory) {
    styleLines.push(
      overrides.textFirstNoAudioReliance
        ? "- AUDITORY (APD override): provide `spoken_narration` that is slow/clear AND fully redundant with on-screen text — never introduce critical info in audio only."
        : "- AUDITORY: write `spoken_narration` as a natural spoken script with spoken rhythm; include pronunciation guidance where relevant.",
    );
  }
  if (ls.hands_on) {
    styleLines.push(
      "- HANDS-ON: include at least 2 `interactive_widget` practice slides (match_pairs and/or multiple_choice) with real drills — not optional filler.",
    );
  }
  if (ls.reading_writing) {
    if (overrides.minimizeWritingLoad || overrides.scannableBulletLayout) {
      styleLines.push(
        "- READING/WRITING (accessibility override): precise short definitions and bullet takeaways only — no free-form writing prompts, no walls of text.",
      );
    } else {
      styleLines.push(
        "- READING/WRITING: denser precise definitions, short worked examples, and a clear takeaway sentence per slide.",
      );
    }
  }
  if (styleLines.length === 1) {
    styleLines.push(
      "- No style toggles — balance visual examples with clear written definitions.",
    );
  }
  sections.push(styleLines.join("\n"));

  const paceLines: string[] = ["[PACE]"];
  if (overrides.effectivePace === "slow") {
    paceLines.push(
      "- Slow: one idea per slide, extra worked example before advancing, gentle scaffolding, no multi-concept dumps.",
    );
  } else if (overrides.effectivePace === "fast") {
    paceLines.push(
      "- Fast: denser slides, assume reasonable prior knowledge, fewer restatements, advanced applications earlier — still obey all accessibility overrides below.",
    );
  } else {
    paceLines.push(
      "- Moderate: clear progression without rushing or over-explaining.",
    );
  }
  sections.push(paceLines.join("\n"));

  const supportLines: string[] = ["[ACCESSIBILITIES / SUPPORT MODES — structural overrides]"];
  if (overrides.adhdMicroLearning) {
    supportLines.push(
      "- ADHD micro-learning (ENFORCE): short paragraphs only; one idea per slide; scannable bullets (3–5 max); bold the key term; high-frequency micro-checkpoints (a tiny interactive_widget or callout check every 2–3 slides); immediate reward/feedback tone in callouts (celebrate the attempt, never shame).",
    );
  }
  if (overrides.scannableBulletLayout) {
    supportLines.push(
      "- Dyslexia / Dysgraphia (ENFORCE): format ALL teaching text as clean scannable bullet points with short sentences and clear typographic hierarchy (heading → bullets → one-line takeaway). FORBIDDEN: dense paragraphs, multi-clause walls of text, copy/rewrite/free-form writing tasks. Prefer match_pairs / multiple_choice for practice.",
    );
  }
  if (overrides.conceptualMathFraming) {
    supportLines.push(
      "- Dyscalculia / Math anxiety (ENFORCE): avoid raw numerical walls and unexplained symbol dumps; frame math/logic through conceptual and visual-spatial analogies; use color-coded quantity language in `visual_hint`; zero-penalty trial steps (invite attempt without pressure, no timer/shame language); step-by-step only.",
    );
  }
  if (overrides.textFirstNoAudioReliance) {
    supportLines.push(
      "- APD (ENFORCE): text clarity first — every teaching point must appear in on-screen text; `spoken_narration` may reinforce but must not carry unique information; avoid assuming the learner can rely on audio.",
    );
  }
  if (overrides.explicitVerbalSteps) {
    supportLines.push(
      "- NVLD (ENFORCE): explicit numbered verbal steps; explain every diagram in plain words; avoid idioms, sarcasm, and vague figurative metaphors.",
    );
  }
  if (supportLines.length === 1) {
    supportLines.push("- No support modes active.");
  }
  sections.push(supportLines.join("\n"));

  if (adapt.lessons_completed >= 2) {
    const observed: string[] = ["[OBSERVED USAGE — weight these]"];
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
      observed.push(
        `- Stronger engagement with ${ranked
          .map(([k, v]) => `${k.replace("_", "/")}~${Math.round(v * 100)}%`)
          .join(", ")}.`,
      );
    }
    if (adapt.preferred_chunk === "micro" || adapt.preferred_chunk === "short") {
      observed.push(
        `- Chunk preference: ${adapt.preferred_chunk} — keep lessons tighter than a default curriculum.`,
      );
    }
    if (adapt.quizzes_taken >= 2 && adapt.quiz_correct_rate < 0.55) {
      observed.push(
        "- Quiz struggle: more scaffolding, worked examples, easier practice before nuance.",
      );
    } else if (adapt.quizzes_taken >= 2 && adapt.quiz_correct_rate > 0.85) {
      observed.push(
        "- Strong quiz performance: raise difficulty slightly; skip over-explaining basics.",
      );
    }
    if (observed.length > 1) sections.push(observed.join("\n"));
  }

  sections.push(
    [
      "[HARD RULES]",
      "- Every style, pace, and accessibility bullet above is mandatory.",
      "- Accessibility structural overrides always beat conflicting style/pace density preferences.",
      "- The lesson/roadmap JSON must look different for this profile than for a learner with opposite preferences.",
      "- Never silently ignore any listed item.",
    ].join("\n"),
  );

  return sections.join("\n\n");
}
