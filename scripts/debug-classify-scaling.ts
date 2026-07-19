/**
 * Cheap diagnostic for the new topic-aware module scaling: calls only
 * `classifyAndBuildRoadmap` (no lesson content generation) across a few
 * topic/tier combos and prints the resulting module counts, so we can
 * confirm Gemini is actually varying module count by topic complexity
 * rather than defaulting to the same number every time.
 *
 * Usage: npm run debug:classify-scaling
 */
import { classifyAndBuildRoadmap } from "../lib/gemini";
import {
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  type UserProfile,
} from "../types/database";

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

const CASES: { topic: string; depth: "overview" | "deep_dive" | "complete_mastery" }[] = [
  { topic: "The Pythagorean theorem", depth: "complete_mastery" },
  { topic: "Learn Japanese from scratch", depth: "complete_mastery" },
  { topic: "Photosynthesis", depth: "overview" },
  { topic: "Learn conversational Arabic from scratch", depth: "deep_dive" },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  for (const { topic, depth } of CASES) {
    const context = { depth };
    const start = Date.now();
    const classification = await classifyAndBuildRoadmap(topic, fakeProfile, context);
    const moduleCount = classification.roadmap_tree.phases.flatMap((p) => p.modules).length;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `\n[${depth}] "${topic}" -> scope=${classification.scope_type}, modules=${moduleCount}, phases=${classification.roadmap_tree.phases.length} (${elapsed}s)`,
    );
    for (const phase of classification.roadmap_tree.phases) {
      console.log(`  Phase: ${phase.title}`);
      for (const mod of phase.modules) {
        console.log(`    - ${mod.title}`);
      }
    }
    await sleep(1000);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
