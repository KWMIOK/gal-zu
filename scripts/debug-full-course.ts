/**
 * Replicates the *entire* createCourseFromPrompt loop (classification +
 * every lesson plan, not just the first lesson) against the live Gemini
 * API, and prints a short fingerprint per lesson so duplicate/near-identical
 * content across a course is immediately obvious without eyeballing full
 * JSON dumps.
 *
 * Usage: npm run debug:course -- "topic here" [quick_answer|overview|deep_dive|complete_mastery]
 */
import { appendFileSync, writeFileSync } from "fs";
import { join } from "path";

import { classifyAndBuildRoadmap, generateLessonPayload } from "../lib/gemini";
import type { PromptDepth } from "../lib/generation/create-course";
import { buildLessonPlans, slideCountTarget } from "../lib/gemini/lesson-plans";
import {
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  type SlideContent,
  type UserProfile,
} from "../types/database";

// Written to alongside stdout so progress is visible even if the terminal
// harness only surfaces output once the process fully exits.
const START = Date.now();
const LOG_PATH = join(__dirname, ".debug-course-log.txt");
writeFileSync(LOG_PATH, `Run started ${new Date().toISOString()}\n`);
function log(line: string) {
  const stamped = `[+${((Date.now() - START) / 1000).toFixed(1)}s] ${line}`;
  console.log(stamped);
  appendFileSync(LOG_PATH, stamped + "\n");
}

const topic = process.argv[2] ?? "Georgian language, from scratch";
const depth = (process.argv[3] as PromptDepth) ?? "complete_mastery";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  log(`Starting classifyAndBuildRoadmap("${topic}", depth=${depth})...`);
  const context = { depth };
  const classification = await classifyAndBuildRoadmap(topic, fakeProfile, context);
  log(`Course: "${classification.title}" (${classification.scope_type})`);
  log(`Modules: ${classification.roadmap_tree.phases.flatMap((p) => p.modules).length}`);

  const plans = buildLessonPlans(classification, topic, context);
  log(`Planned lessons: ${plans.length}`);

  const slides = slideCountTarget(context);
  const fingerprints: string[] = [];

  for (let i = 0; i < plans.length; i++) {
    if (i > 0) await sleep(1500);
    const plan = plans[i];
    log(`Generating lesson ${i + 1}/${plans.length}: "${plan.title}"...`);
    const payload = await generateLessonPayload(
      plan.topic,
      plan.format,
      fakeProfile,
      `Course: ${classification.title}\nLesson ${i + 1} of ${plans.length}: ${plan.title}`,
      slides,
    );
    const firstSlideTitle =
      payload.type === "slideshow" ? (payload as SlideContent).slides[0]?.title : "(non-slideshow)";
    const fingerprint = JSON.stringify(payload).slice(0, 120);
    fingerprints.push(fingerprint);
    log(`Lesson ${i + 1} done — first slide: "${firstSlideTitle}"`);
  }

  const unique = new Set(fingerprints).size;
  log(`${unique}/${fingerprints.length} lessons have unique content fingerprints.`);
  log(unique < fingerprints.length ? "*** DUPLICATE CONTENT DETECTED ***" : "All lessons are distinct.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
