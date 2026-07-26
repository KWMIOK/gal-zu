import {
  DEFAULT_FONT_STYLE,
  DEFAULT_LEARNING_ADAPTATION,
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  DEFAULT_PREFERRED_LANGUAGE,
  type FontStyle,
  type LearningAdaptation,
  type LearningStyles,
  type NeurodivergentAccommodations,
  type PreferredLanguage,
  type UserProfile,
} from "@/types/database";
import {
  isFontStyle,
  isPreferredLanguage,
} from "@/lib/preferences/language-font";

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
    dyslexia: { ...base.dyslexia, ...(raw?.dyslexia ?? {}) },
    dysgraphia: { ...base.dysgraphia, ...(raw?.dysgraphia ?? {}) },
    nvld: { ...base.nvld, ...(raw?.nvld ?? {}) },
    apd: { ...base.apd, ...(raw?.apd ?? {}) },
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

export function normalizePreferredLanguage(
  raw: unknown,
): PreferredLanguage {
  return isPreferredLanguage(raw) ? raw : DEFAULT_PREFERRED_LANGUAGE;
}

export function normalizeFontStyle(raw: unknown): FontStyle {
  return isFontStyle(raw) ? raw : DEFAULT_FONT_STYLE;
}

export function normalizeUserProfileRow(
  profile: UserProfile | null,
): {
  learning_styles: LearningStyles;
  neurodivergent_accommodations: NeurodivergentAccommodations;
  learning_adaptation: LearningAdaptation;
  preferred_language: PreferredLanguage;
  font_style: FontStyle;
} {
  if (!profile) {
    return {
      learning_styles: { ...DEFAULT_LEARNING_STYLES },
      neurodivergent_accommodations: { ...DEFAULT_NEURODIVERGENT_ACCOMMODATIONS },
      learning_adaptation: { ...DEFAULT_LEARNING_ADAPTATION },
      preferred_language: DEFAULT_PREFERRED_LANGUAGE,
      font_style: DEFAULT_FONT_STYLE,
    };
  }

  return {
    learning_styles: normalizeLearningStyles(profile.learning_styles),
    neurodivergent_accommodations: normalizeNeurodivergentAccommodations(
      profile.neurodivergent_accommodations,
    ),
    learning_adaptation: normalizeLearningAdaptation(profile.learning_adaptation),
    preferred_language: normalizePreferredLanguage(profile.preferred_language),
    font_style: normalizeFontStyle(profile.font_style),
  };
}

/** Short summary for UI — confirms preferences apply to Gemini prompts. */
export function profilePreferenceSummary(
  profile: UserProfile | null,
): string[] {
  const {
    learning_styles: ls,
    neurodivergent_accommodations: nd,
    preferred_language,
    font_style,
  } = normalizeUserProfileRow(profile);
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
  bits.push(`Language: ${preferred_language}`);
  bits.push(`Font: ${font_style}`);

  if (nd.adhd.enabled) bits.push("ADHD micro-learning");
  if (nd.dyscalculia.enabled) bits.push("Dyscalculia supports");
  if (nd.math_anxiety.enabled) bits.push("Low-pressure math mode");
  if (nd.dyslexia.enabled) bits.push("Dyslexia reading supports");
  if (nd.dysgraphia.enabled) bits.push("Dysgraphia writing supports");
  if (nd.nvld.enabled) bits.push("NVLD supports");
  if (nd.apd.enabled) bits.push("APD supports");

  const adapt = normalizeLearningAdaptation(profile?.learning_adaptation);
  if (adapt.lessons_completed >= 3) {
    bits.push("Adapting from your usage");
  }

  return bits;
}
