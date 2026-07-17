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

export const LESSONS_PER_MODULE_MACRO = 2;

export function isMasteryPath(context?: GeminiGenerationContext): boolean {
  return (
    context?.depth === "complete_mastery" ||
    context?.sessionLength === "multi_week"
  );
}

export function isQuickAnswerPath(context?: GeminiGenerationContext): boolean {
  return context?.depth === "quick_answer";
}

function ensureId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function countModules(tree: RoadmapTree): number {
  return tree.phases.reduce((sum, p) => sum + p.modules.length, 0);
}

const MASTERY_MODULE_TEMPLATES = [
  "Alphabet, script & phonetics",
  "Core vocabulary & pronunciation",
  "Essential grammar patterns",
  "Everyday conversation skills",
  "Listening & reading practice",
  "Review, pitfalls & fluency drills",
];

export function ensureMacroRoadmapScale(
  tree: RoadmapTree,
  topic: string,
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

  while (moduleCount < 4) {
    const template =
      MASTERY_MODULE_TEMPLATES[moduleCount] ??
      `Module ${moduleCount + 1}: ${topic}`;
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
      title: template,
      description: `Build mastery of ${topic} — ${template.toLowerCase()}.`,
      order: working.phases[phaseIndex].modules.length,
      estimated_minutes: 25,
    });
    moduleCount += 1;
  }

  if (moduleCount > 6) {
    const trimmedPhases: RoadmapPhase[] = [];
    let kept = 0;
    for (const phase of working.phases) {
      const modules: RoadmapModule[] = [];
      for (const mod of phase.modules) {
        if (kept >= 6) break;
        modules.push(mod);
        kept += 1;
      }
      if (modules.length > 0) {
        trimmedPhases.push({ ...phase, modules });
      }
      if (kept >= 6) break;
    }
    working.phases = trimmedPhases;
  }

  return working;
}

export function buildLessonPlans(
  classification: ClassificationSnapshot,
  cleanTopic: string,
  context?: GeminiGenerationContext,
): PlannedLesson[] {
  if (!isMasteryPath(context)) {
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
  if (isMasteryPath(context)) {
    return { min: 5, max: 8 };
  }
  return { min: 5, max: 6 };
}

export function lessonsPerModuleForScope(scopeType: ScopeType): number {
  if (scopeType === "macro" || scopeType === "unit") {
    return LESSONS_PER_MODULE_MACRO;
  }
  return 1;
}

export type { PromptDepth };
