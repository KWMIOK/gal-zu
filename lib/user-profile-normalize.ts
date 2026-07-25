import {
  DEFAULT_LEARNING_ADAPTATION,
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  type LearningAdaptation,
  type LearningStyles,
  type NeurodivergentAccommodations,
  type UserProfile,
} from "@/types/database";

export function normalizeLearningStyles(
  raw: Partial<LearningStyles> | null | undefined,
): LearningStyles {
  return {
    ...DEFAULT_LEARNING_STYLES,
    ...(raw ?? {}),
  };
}

export function normalizeNeurodivergentAccommodations(
  raw: Partial<NeurodivergentAccommodations> | null | undefined,
): NeurodivergentAccommodations {
  const base = DEFAULT_NEURODIVERGENT_ACCOMMODATIONS;
  return {
    adhd: { ...base.adhd, ...(raw?.adhd ?? {}) },
    dyscalculia: { ...base.dyscalculia, ...(raw?.dyscalculia ?? {}) },
    math_anxiety: { ...base.math_anxiety, ...(raw?.math_anxiety ?? {}) },
  };
}

export function normalizeLearningAdaptation(
  raw: Partial<LearningAdaptation> | null | undefined,
): LearningAdaptation {
  return {
    ...DEFAULT_LEARNING_ADAPTATION,
    ...(raw ?? {}),
    style_affinity: {
      ...DEFAULT_LEARNING_ADAPTATION.style_affinity,
      ...(raw?.style_affinity ?? {}),
    },
    recent_quiz_scores: [...(raw?.recent_quiz_scores ?? [])],
  };
}

export function normalizeUserProfileRow(
  profile: UserProfile | null,
): {
  learning_styles: LearningStyles;
  neurodivergent_accommodations: NeurodivergentAccommodations;
  learning_adaptation: LearningAdaptation;
} {
  if (!profile) {
    return {
      learning_styles: { ...DEFAULT_LEARNING_STYLES },
      neurodivergent_accommodations: { ...DEFAULT_NEURODIVERGENT_ACCOMMODATIONS },
      learning_adaptation: { ...DEFAULT_LEARNING_ADAPTATION },
    };
  }

  return {
    learning_styles: normalizeLearningStyles(profile.learning_styles),
    neurodivergent_accommodations: normalizeNeurodivergentAccommodations(
      profile.neurodivergent_accommodations,
    ),
    learning_adaptation: normalizeLearningAdaptation(profile.learning_adaptation),
  };
}

/** Short summary for UI — confirms preferences apply to Gemini prompts. */
export function profilePreferenceSummary(
  profile: UserProfile | null,
): string[] {
  const { learning_styles: ls, neurodivergent_accommodations: nd } =
    normalizeUserProfileRow(profile);
  const bits: string[] = [];

  const styles = (
    [
      ls.visual && "visual",
      ls.auditory && "auditory",
      ls.hands_on && "hands-on",
      ls.reading_writing && "reading/writing",
    ] as const
  ).filter(Boolean);
  if (styles.length) bits.push(`Styles: ${styles.join(", ")}`);
  if (ls.preferred_pace) bits.push(`Pace: ${ls.preferred_pace}`);

  if (nd.adhd.enabled) bits.push("ADHD micro-learning");
  if (nd.dyscalculia.enabled) bits.push("Dyscalculia supports");
  if (nd.math_anxiety.enabled) bits.push("Low-pressure math mode");

  const adapt = normalizeLearningAdaptation(profile?.learning_adaptation);
  if (adapt.lessons_completed >= 3) {
    bits.push("Adapting from your usage");
  }

  return bits;
}
