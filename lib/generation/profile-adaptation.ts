import {
  DEFAULT_LEARNING_ADAPTATION,
  type LearningAdaptation,
  type LessonFormat,
  type UserProfile,
} from "@/types/database";
import {
  buildCognitiveProfileSystemBlock,
  resolveCognitiveProfile,
} from "@/lib/generation/accessibility-rules";

export type LearningSignal =
  | { kind: "lesson_completed"; format: LessonFormat }
  | { kind: "quiz_finished"; scorePercent: number; questionCount: number };

/**
 * Pre-Gemini profile instruction block. Runs the accessibility rule engine
 * (conflict resolution + structural overrides) then returns the multi-
 * dimensional cognitive profile system prompt for styles, pace, and supports.
 */
export function buildProfileAdaptationInstructions(profile: UserProfile): string {
  return buildCognitiveProfileSystemBlock(profile);
}

/** Structural slide-range nudge from profile (applied on top of depth tier). */
export function adjustSlideRangeForProfile(
  base: { min: number; max: number },
  profile: UserProfile,
): { min: number; max: number } {
  let { min, max } = base;
  const { overrides } = resolveCognitiveProfile(profile);
  const chunk = profile.learning_adaptation?.preferred_chunk ?? "standard";

  if (overrides.adhdMicroLearning || chunk === "micro") {
    min = Math.max(3, min - 2);
    max = Math.max(min, max - 2);
  } else if (
    overrides.effectivePace === "slow" ||
    chunk === "short" ||
    overrides.scannableBulletLayout ||
    overrides.conceptualMathFraming
  ) {
    min = Math.max(4, min - 1);
    max = Math.max(min, max + 1);
  } else if (
    overrides.effectivePace === "fast" &&
    !overrides.textFirstNoAudioReliance &&
    !overrides.explicitVerbalSteps
  ) {
    min = min + 1;
    max = max + 1;
  }

  if (overrides.explicitVerbalSteps || overrides.textFirstNoAudioReliance) {
    max = max + 1;
  }

  // ADHD micro-checkpoints need room for frequent interactive beats.
  if (overrides.adhdMicroLearning) {
    max = Math.max(min, max + 1);
  }

  return { min, max: Math.max(min, max) };
}

/**
 * Pick lesson formats from style prefs + resolved accessibility overrides
 * so support modes visibly change course shape (not only prompt text).
 */
export function pickLessonFormatsForModule(
  lessonsInModule: number,
  profile: UserProfile,
  fallback: LessonFormat = "slideshow",
): LessonFormat[] {
  const ls = profile.learning_styles;
  const adapt = profile.learning_adaptation ?? DEFAULT_LEARNING_ADAPTATION;
  const { overrides } = resolveCognitiveProfile(profile);
  const formats: LessonFormat[] = [];

  const handsOn =
    ls.hands_on ||
    adapt.style_affinity.hands_on >= 0.4 ||
    overrides.minimizeWritingLoad;
  const auditory =
    (ls.auditory || adapt.style_affinity.auditory >= 0.4) &&
    !overrides.textFirstNoAudioReliance;
  const reading =
    (ls.reading_writing || adapt.style_affinity.reading_writing >= 0.4) &&
    !overrides.minimizeWritingLoad &&
    !overrides.scannableBulletLayout;

  if (lessonsInModule <= 1) {
    if (overrides.minimizeWritingLoad || (handsOn && !ls.visual && !reading)) {
      return ["quiz"];
    }
    if (overrides.textFirstNoAudioReliance || overrides.scannableBulletLayout) {
      return ["slideshow"];
    }
    if (overrides.explicitVerbalSteps && !ls.visual) return ["script"];
    if (auditory && !ls.visual && !reading && !handsOn) return ["script"];
    if (reading && !ls.visual && !handsOn) return ["cheat_sheet"];
    return [fallback];
  }

  if (overrides.textFirstNoAudioReliance || overrides.scannableBulletLayout) {
    formats.push("slideshow");
  } else if (overrides.explicitVerbalSteps && auditory) {
    formats.push("script");
  } else {
    formats.push(auditory && !ls.visual && !reading ? "script" : "slideshow");
  }

  if (overrides.minimizeWritingLoad || handsOn || overrides.adhdMicroLearning) {
    formats.push("quiz");
  } else if (reading) formats.push("cheat_sheet");
  else if (auditory && !overrides.textFirstNoAudioReliance) formats.push("script");
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
