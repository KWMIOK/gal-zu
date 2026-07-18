import bounceData from "@/lib/animations/data/bounce.json";
import celebrationData from "@/lib/animations/data/celebration.json";
import ideaData from "@/lib/animations/data/idea.json";
import pulseData from "@/lib/animations/data/pulse.json";
import successData from "@/lib/animations/data/success.json";
import thinkingData from "@/lib/animations/data/thinking.json";

/**
 * Tags Gemini is instructed to prefer for `animation_prompt` (see the
 * lesson-generation system prompt in `lib/gemini.ts`). Any other string is
 * still accepted — `resolveLottieAnimation` fuzzy-matches it by keyword, and
 * falls back to a neutral pulse if nothing matches.
 */
export const ANIMATION_TAGS = [
  "celebration",
  "bouncing_math_equation",
  "thinking",
  "lightbulb_idea",
  "success_checkmark",
] as const;

export type AnimationTag = (typeof ANIMATION_TAGS)[number];

const TAG_TO_DATA: Record<AnimationTag, object> = {
  celebration: celebrationData,
  bouncing_math_equation: bounceData,
  thinking: thinkingData,
  lightbulb_idea: ideaData,
  success_checkmark: successData,
};

const KEYWORD_ALIASES: Array<{ pattern: RegExp; tag: AnimationTag }> = [
  { pattern: /celebrat|confetti|win|congrat|party/i, tag: "celebration" },
  { pattern: /bounc|math|equation|number|calculat|count/i, tag: "bouncing_math_equation" },
  { pattern: /think|ponder|question|puzzle|hmm/i, tag: "thinking" },
  { pattern: /idea|lightbulb|insight|aha|eureka/i, tag: "lightbulb_idea" },
  { pattern: /success|checkmark|complete|correct|done|mastery/i, tag: "success_checkmark" },
];

/**
 * Maps Gemini's free-form `animation_prompt` tag to a bundled, lightweight
 * Lottie animation. Unknown/absent tags degrade gracefully to a neutral
 * pulse rather than rendering nothing.
 */
export function resolveLottieAnimation(animationPrompt?: string): object {
  if (!animationPrompt) return pulseData;

  const normalized = animationPrompt.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized in TAG_TO_DATA) {
    return TAG_TO_DATA[normalized as AnimationTag];
  }

  for (const { pattern, tag } of KEYWORD_ALIASES) {
    if (pattern.test(animationPrompt)) {
      return TAG_TO_DATA[tag];
    }
  }

  return pulseData;
}
