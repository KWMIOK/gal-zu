/**
 * Reproduces a real course-creation call against the live Gemini API using
 * the actual lib/gemini.ts code path, and prints whether the result is
 * genuine model output or the generic fallback template — plus, thanks to
 * the new per-candidate logging in generateStructuredJson, *why* each model
 * candidate failed if it did.
 *
 * Usage: node --env-file=.env.local -r ./scripts/_stub-server-only.cjs -r tsx/cjs scripts/debug-lesson-gen.ts "topic here" [quick_answer|overview|deep_dive|complete_mastery]
 */
import { classifyAndBuildRoadmap, generateLessonPayload } from "../lib/gemini";
import type { PromptDepth } from "../lib/generation/create-course";
import {
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  type UserProfile,
} from "../types/database";

const topic = process.argv[2] ?? "Arabic language";
const depth = (process.argv[3] as PromptDepth) ?? "quick_answer";

const fakeProfile: UserProfile = {
  id: "debug_user",
  learning_styles: DEFAULT_LEARNING_STYLES,
  neurodivergent_accommodations: DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  plan_tier: "pro",
  subscription_status: "none",
  subscription_expires_at: null,
  subscription_updated_at: null,
  revenuecat_app_user_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function isFallbackLooking(text: string): boolean {
  return /core definition|worked example|pitfalls & recap|Define .* with one precise sentence/i.test(
    text,
  );
}

async function main() {
  console.log(`\n=== classifyAndBuildRoadmap("${topic}", depth=${depth}) ===`);
  const classification = await classifyAndBuildRoadmap(topic, fakeProfile, {
    depth,
  });
  console.log(JSON.stringify(classification, null, 2));

  console.log(`\n=== generateLessonPayload("${classification.first_lesson.topic}") ===`);
  const lesson = await generateLessonPayload(
    classification.first_lesson.topic,
    classification.first_lesson.format,
    fakeProfile,
    `Course: ${classification.title}`,
    { min: 5, max: 8 },
  );
  console.log(JSON.stringify(lesson, null, 2));

  const flatText = JSON.stringify(lesson);
  console.log(
    isFallbackLooking(flatText)
      ? "\n*** This looks like the GENERIC FALLBACK template, not real model output. ***"
      : "\n*** This looks like real generated content. ***",
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
