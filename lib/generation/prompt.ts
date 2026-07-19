import type {
  CreateCourseFromPromptOptions,
  PromptDepth,
  PromptSessionLength,
} from "@/lib/generation/create-course";

const POLLUTION_MARKERS = [
  "Depth preference:",
  "Time budget:",
  "Learner depth goal:",
  "Available time:",
] as const;

/** Strip UI metadata accidentally concatenated into the learner topic string. */
export function sanitizeLearnerTopic(raw: string): string {
  let topic = raw.trim();

  for (const marker of POLLUTION_MARKERS) {
    const idx = topic.indexOf(marker);
    if (idx !== -1) {
      topic = topic.slice(0, idx).trim();
    }
  }

  const firstLine = topic.split(/\r?\n/)[0]?.trim();
  if (firstLine) {
    topic = firstLine;
  }

  return topic.replace(/\s{2,}/g, " ").trim();
}

export type GeminiGenerationContext = {
  depth?: PromptDepth;
  sessionLength?: PromptSessionLength;
};

export function buildScopeHints(
  options?: CreateCourseFromPromptOptions | GeminiGenerationContext,
): string {
  const lines: string[] = [];

  if (options?.depth === "quick_answer") {
    lines.push(
      "Depth goal: quick_answer — one concise lesson answering the topic directly, no roadmap.",
    );
  }
  if (options?.depth === "overview") {
    lines.push(
      "Depth goal: overview — a short guided tour hitting the handful of ideas someone genuinely needs for a solid working understanding, not exhaustive coverage.",
    );
  }
  if (options?.depth === "deep_dive") {
    lines.push(
      "Depth goal: deep_dive — a substantial multi-module course covering the topic properly, including nuance and practice, without necessarily reaching full mastery.",
    );
  }
  if (options?.depth === "complete_mastery") {
    lines.push(
      "Depth goal: complete_mastery — the full curriculum a real course on this topic would need, as many phases/modules as the topic genuinely requires.",
    );
  }
  if (options?.sessionLength === "5min") {
    lines.push("Session budget: ~5 minutes for lesson 1.");
  }
  if (options?.sessionLength === "20min") {
    lines.push("Session budget: ~20 minutes for lesson 1.");
  }
  if (options?.sessionLength === "multi_week") {
    lines.push("Session budget: multi-week roadmap with weekly phases.");
  }

  return lines.join("\n");
}

export function sanitizeCourseText(text: string): string {
  return sanitizeLearnerTopic(text);
}

/** @deprecated Use sanitizeLearnerTopic + buildScopeHints instead. */
export function buildEnrichedPrompt(
  base: string,
  options?: CreateCourseFromPromptOptions,
): string {
  const topic = sanitizeLearnerTopic(base);
  const hints = buildScopeHints(options);
  return hints ? `${topic}\n${hints}` : topic;
}
