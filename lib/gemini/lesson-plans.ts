import { randomUUID } from "crypto";

import type { PromptDepth } from "@/lib/generation/create-course";
import type { GeminiGenerationContext } from "@/lib/generation/prompt";
import type {
  LessonFormat,
  RoadmapModule,
  RoadmapPhase,
  RoadmapTree,
  ScopeType,
} from "@/types/database";

export type ClassificationSnapshot = {
  scope_type: ScopeType;
  title: string;
  description: string;
  roadmap_tree: RoadmapTree;
  first_lesson: {
    title: string;
    topic: string;
    format: LessonFormat;
  };
};

export type PlannedLesson = {
  title: string;
  topic: string;
  format: LessonFormat;
  moduleId: string;
  phaseTitle: string;
  moduleTitle: string;
};

/**
 * Per-tier shape. `moduleRange` is intentionally wide — Gemini is asked to
 * pick a module count *inside* this band based on the topic's real
 * complexity (see the classification prompt in lib/gemini.ts) rather than
 * always landing on the same fixed number regardless of whether the topic
 * is "the Pythagorean theorem" or "learn Japanese from scratch". The range
 * only exists as a safety net (pad up / trim down) for when Gemini ignores
 * the guidance.
 */
export type DepthTierConfig = {
  scopeType: ScopeType;
  moduleRange: { min: number; max: number };
  lessonsPerModule: number;
  slideRange: { min: number; max: number };
};

const DEPTH_TIER_CONFIG: Record<
  Exclude<PromptDepth, "quick_answer">,
  DepthTierConfig
> = {
  overview: {
    scopeType: "unit",
    moduleRange: { min: 2, max: 4 },
    lessonsPerModule: 1,
    slideRange: { min: 5, max: 6 },
  },
  deep_dive: {
    scopeType: "unit",
    moduleRange: { min: 4, max: 7 },
    lessonsPerModule: 2,
    slideRange: { min: 6, max: 8 },
  },
  complete_mastery: {
    scopeType: "macro",
    // Previously hard-clamped to exactly 4-6 modules total regardless of
    // topic — "learn a whole language from scratch" and "master the
    // quadratic formula" got the same shape. Widened so genuinely broad
    // topics can actually get the module count they need.
    moduleRange: { min: 5, max: 14 },
    lessonsPerModule: 2,
    slideRange: { min: 6, max: 8 },
  },
};

/** Falls back to "quick_answer" only if the caller genuinely passed nothing. */
export function resolveDepthTier(context?: GeminiGenerationContext): PromptDepth {
  if (context?.depth) return context.depth;
  if (context?.sessionLength === "multi_week") return "complete_mastery";
  return "quick_answer";
}

export function isMasteryPath(context?: GeminiGenerationContext): boolean {
  return resolveDepthTier(context) !== "quick_answer";
}

export function isQuickAnswerPath(context?: GeminiGenerationContext): boolean {
  return resolveDepthTier(context) === "quick_answer";
}

function depthTierConfig(context?: GeminiGenerationContext): DepthTierConfig | null {
  const tier = resolveDepthTier(context);
  if (tier === "quick_answer") return null;
  return DEPTH_TIER_CONFIG[tier];
}

function ensureId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function countModules(tree: RoadmapTree): number {
  return tree.phases.reduce((sum, p) => sum + p.modules.length, 0);
}

// Generic padding-only filler, used solely as a safety net when Gemini's
// roadmap comes back under the tier's module minimum (rare once the
// classification prompt spells out the target range) — never the primary
// source of module titles.
const GENERIC_MODULE_FILLERS = [
  "Foundations & core vocabulary",
  "Building blocks & essential rules",
  "Real-world application & practice",
  "Nuance, edge cases & exceptions",
  "Common pitfalls & how to avoid them",
  "Putting it all together",
  "Advanced patterns & fluency",
  "Review & consolidation",
];

export function ensureRoadmapScale(
  tree: RoadmapTree,
  topic: string,
  config: DepthTierConfig,
): RoadmapTree {
  const working: RoadmapTree = {
    version: 1,
    phases: tree.phases.map((p) => ({
      ...p,
      modules: [...p.modules],
    })),
    total_estimated_hours: tree.total_estimated_hours,
    notes: tree.notes,
  };

  let moduleCount = countModules(working);

  while (moduleCount < config.moduleRange.min) {
    const template =
      GENERIC_MODULE_FILLERS[moduleCount % GENERIC_MODULE_FILLERS.length];
    let phaseIndex = working.phases.length - 1;
    if (phaseIndex < 0) {
      working.phases.push({
        id: ensureId("phase"),
        title: "Phase 1",
        order: 0,
        modules: [],
      });
      phaseIndex = 0;
    }

    working.phases[phaseIndex].modules.push({
      id: ensureId("mod"),
      title: `${template} (${topic})`,
      description: `Build understanding of ${topic} — ${template.toLowerCase()}.`,
      order: working.phases[phaseIndex].modules.length,
      estimated_minutes: 25,
    });
    moduleCount += 1;
  }

  if (moduleCount > config.moduleRange.max) {
    const trimmedPhases: RoadmapPhase[] = [];
    let kept = 0;
    for (const phase of working.phases) {
      const modules: RoadmapModule[] = [];
      for (const mod of phase.modules) {
        if (kept >= config.moduleRange.max) break;
        modules.push(mod);
        kept += 1;
      }
      if (modules.length > 0) {
        trimmedPhases.push({ ...phase, modules });
      }
      if (kept >= config.moduleRange.max) break;
    }
    working.phases = trimmedPhases;
  }

  return working;
}

/** @deprecated Use `ensureRoadmapScale` with a tier config instead. */
export function ensureMacroRoadmapScale(tree: RoadmapTree, topic: string): RoadmapTree {
  return ensureRoadmapScale(tree, topic, DEPTH_TIER_CONFIG.complete_mastery);
}

export function buildLessonPlans(
  classification: ClassificationSnapshot,
  cleanTopic: string,
  context?: GeminiGenerationContext,
): PlannedLesson[] {
  const config = depthTierConfig(context);

  if (!config) {
    return [
      {
        title: classification.first_lesson.title,
        topic: classification.first_lesson.topic,
        format: classification.first_lesson.format,
        moduleId:
          classification.roadmap_tree.phases[0]?.modules[0]?.id ?? "mod_1",
        phaseTitle:
          classification.roadmap_tree.phases[0]?.title ?? "Quick lesson",
        moduleTitle:
          classification.roadmap_tree.phases[0]?.modules[0]?.title ??
          classification.title,
      },
    ];
  }

  const plans: PlannedLesson[] = [];

  for (const phase of classification.roadmap_tree.phases) {
    for (const mod of phase.modules) {
      if (config.lessonsPerModule === 1) {
        plans.push({
          title: mod.title,
          topic: `${cleanTopic}: ${mod.title}`,
          format: "slideshow",
          moduleId: mod.id,
          phaseTitle: phase.title,
          moduleTitle: mod.title,
        });
        continue;
      }

      plans.push({
        title: `${mod.title} — Foundations`,
        topic: `${cleanTopic}: ${mod.title} (core concepts and examples)`,
        format: "slideshow",
        moduleId: mod.id,
        phaseTitle: phase.title,
        moduleTitle: mod.title,
      });
      plans.push({
        title: `${mod.title} — Practice & nuance`,
        topic: `${cleanTopic}: ${mod.title} (application, pitfalls, and drills)`,
        format: "slideshow",
        moduleId: mod.id,
        phaseTitle: phase.title,
        moduleTitle: mod.title,
      });
    }
  }

  return plans;
}

export function slideCountTarget(context?: GeminiGenerationContext): {
  min: number;
  max: number;
} {
  const config = depthTierConfig(context);
  return config?.slideRange ?? { min: 5, max: 6 };
}

export { DEPTH_TIER_CONFIG };
export type { PromptDepth };
