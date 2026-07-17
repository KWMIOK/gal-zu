import "server-only";

import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";
import type { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { parseJsonUnknown } from "@/lib/gemini/json";
import {
  buildScopeHints,
  sanitizeCourseText,
  sanitizeLearnerTopic,
  type GeminiGenerationContext,
} from "@/lib/generation/prompt";
import {
  ensureMacroRoadmapScale,
  isMasteryPath,
  isQuickAnswerPath,
} from "@/lib/gemini/lesson-plans";
import {
  courseClassificationSchema,
  lessonPayloadSchemaForFormat,
  type ValidatedLessonPayload,
} from "@/lib/gemini/schemas";
import type {
  LessonContentPayload,
  LessonFormat,
  RoadmapModule,
  RoadmapPhase,
  RoadmapTree,
  ScopeType,
  SlideContent,
  UserProfile,
} from "@/types/database";

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter((value): value is string => Boolean(value));

export class GeminiEngineError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GeminiEngineError";
  }
}

export type CourseClassificationResult = {
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

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const { GEMINI_API_KEY } = getServerEnv();
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return geminiClient;
}

function buildProfileAdaptationInstructions(profile: UserProfile): string {
  const { learning_styles: ls, neurodivergent_accommodations: nd } = profile;
  const lines: string[] = [
    "Adapt content to this learner profile:",
    `- Learning styles: visual=${ls.visual}, auditory=${ls.auditory}, hands_on=${ls.hands_on}, reading_writing=${ls.reading_writing}, pace=${ls.preferred_pace ?? "moderate"}.`,
  ];

  if (nd.adhd.enabled || nd.adhd.micro_learning_mode) {
    lines.push(
      "- ADHD / micro-learning: use short chunks, one idea per slide, scannable bullets, optional break prompts.",
    );
  }
  if (nd.dyscalculia.enabled || nd.dyscalculia.visual_math_aids) {
    lines.push(
      "- Dyscalculia: step-by-step math, visual metaphors, mention color-coded numbers in visual_hint when relevant.",
    );
  }
  if (nd.math_anxiety.enabled) {
    lines.push(
      "- Math anxiety: warm encouraging tone, no pressure language, gentle progression, hints encouraged.",
    );
  }

  return lines.join("\n");
}

const EDUCATOR_SYSTEM_PREAMBLE = `You are an expert master educator for Gal-zu.
Generate dense, factual, highly engaging educational content in JSON only.

BANNED (never write these patterns):
- "Here's the heart of..."
- "Let's explore this topic together"
- "Focus on the simplest true statement"
- "Review what you learned"
- Any placeholder/meta intro without concrete facts

REQUIRED:
- Real vocabulary, equations, dates, steps, examples, and definitions
- Slide 1: core concept + concrete example or formula
- Slide 2: practical application / step-by-step breakdown
- Slide 3: common pitfalls + key takeaways with specifics`;

async function generateStructuredJson(
  systemInstruction: string,
  userPrompt: string,
  schema: z.ZodType,
): Promise<unknown> {
  const ai = getGeminiClient();
  let lastError: unknown;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) {
        throw new GeminiEngineError(`Empty response from model ${model}.`);
      }

      const parsed = parseJsonUnknown(text);
      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        throw new GeminiEngineError(
          `Schema validation failed for model ${model}: ${validated.error.message}`,
        );
      }

      return validated.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw new GeminiEngineError(
    "All Gemini model attempts failed.",
    lastError,
  );
}

function ensureId(prefix: string, value?: string): string {
  return value && value.trim().length > 0 ? value : `${prefix}_${randomUUID()}`;
}

export function normalizeRoadmapTree(
  tree: RoadmapTree,
  fallbackTitle: string,
): RoadmapTree {
  const phases: RoadmapPhase[] = tree.phases.map((phase, phaseIndex) => {
    const modules: RoadmapModule[] = phase.modules.map((mod, modIndex) => ({
      ...mod,
      id: ensureId("mod", mod.id),
      order: mod.order ?? modIndex,
    }));

    return {
      ...phase,
      id: ensureId("phase", phase.id),
      order: phase.order ?? phaseIndex,
      modules,
    };
  });

  if (phases.length === 0) {
    phases.push({
      id: ensureId("phase"),
      title: "Getting started",
      order: 0,
      modules: [
        {
          id: ensureId("mod"),
          title: fallbackTitle,
          order: 0,
          estimated_minutes: 10,
        },
      ],
    });
  }

  return {
    version: 1,
    phases,
    total_estimated_hours: tree.total_estimated_hours,
    notes: tree.notes,
  };
}

function fallbackClassification(
  topic: string,
  context?: GeminiGenerationContext,
): CourseClassificationResult {
  const clean = sanitizeLearnerTopic(topic);
  const title =
    clean.length > 80 ? `${clean.slice(0, 77).trim()}…` : clean;
  const baseScope =
    context?.sessionLength === "multi_week" ||
    context?.depth === "complete_mastery"
      ? "macro"
      : context?.depth === "quick_answer"
        ? "micro"
        : "micro";

  let roadmap_tree = normalizeRoadmapTree(
    {
      version: 1,
      phases: [
        {
          id: ensureId("phase"),
          title: baseScope === "macro" ? "Phase 1: Foundations" : "Core lesson",
          order: 0,
          modules: [
            {
              id: ensureId("mod"),
              title: `Introduction to ${title}`,
              order: 0,
              estimated_minutes: 10,
            },
          ],
        },
      ],
    },
    title || "Quick lesson",
  );

  if (baseScope === "macro") {
    roadmap_tree = ensureMacroRoadmapScale(roadmap_tree, clean);
  }

  return applyScopeScaling(
    {
      scope_type: baseScope,
      title: title || "Quick lesson",
      description: `Structured path to learn: ${clean}`,
      roadmap_tree,
      first_lesson: {
        title: `Lesson 1: ${title}`,
        topic: clean,
        format: "slideshow",
      },
    },
    clean,
    context,
  );
}

function padSlideDeck(content: SlideContent, minSlides: number): SlideContent {
  const slides = [...content.slides];
  let n = slides.length;
  while (n < minSlides) {
    slides.push({
      id: ensureId("slide"),
      title: `Takeaway ${n + 1}`,
      body: "Consolidate prior slides: name one fact, one example, and one pitfall to remember before moving on.",
    });
    n += 1;
  }
  return { ...content, slides: slides.slice(0, 8) };
}

function applyScopeScaling(
  result: CourseClassificationResult,
  cleanTopic: string,
  context?: GeminiGenerationContext,
): CourseClassificationResult {
  if (isMasteryPath(context)) {
    return {
      ...result,
      scope_type: "macro",
      roadmap_tree: ensureMacroRoadmapScale(result.roadmap_tree, cleanTopic),
    };
  }
  if (isQuickAnswerPath(context)) {
    return {
      ...result,
      scope_type: "micro",
    };
  }
  return result;
}

function fallbackSlideshow(topic: string): SlideContent {
  const clean = sanitizeLearnerTopic(topic);
  const normalized = clean.toLowerCase();

  if (normalized === "1+1" || normalized === "1 + 1") {
    return {
      type: "slideshow",
      estimated_minutes: 3,
      slides: [
        {
          id: ensureId("slide"),
          title: "Addition as combining sets",
          body: "1 + 1 means one unit combined with one unit. In set terms: {●} ∪ {●} has cardinality 2. Equation: 1 + 1 = 2.",
          callout: "Binary: 1₂ + 1₂ = 10₂ (which is 2 in decimal).",
        },
        {
          id: ensureId("slide"),
          title: "Number line & counting",
          body: "Start at 1, move +1 step → you land on 2. Visually: • + • = ••.",
          visual_hint: "Count aloud: one … two.",
        },
        {
          id: ensureId("slide"),
          title: "Pitfalls & takeaways",
          body: "Common mistake: treating '+' as concatenation (1+1 ≠ 11). Takeaway: '+' always means add quantities, so 1+1=2.",
        },
      ],
    };
  }

  if (/georgian|kartvelian|mkhedruli|anbani/i.test(clean)) {
    return {
      type: "slideshow",
      estimated_minutes: 8,
      slides: [
        {
          id: ensureId("slide"),
          title: "Georgian script (Mkhedruli)",
          body: "Modern Georgian uses Mkhedruli: 33 letters, no uppercase. Example letters: ა (a), ბ (b), გ (g), დ (d), ე (e).",
          callout: "Gamarjoba (გამარჯობა) = Hello.",
        },
        {
          id: ensureId("slide"),
          title: "First words & pronunciation",
          body: "Gamarjoba [gɑmɑrdʒɔbɑ] — hello. Madloba (მადლობა) — thank you. Nakhvamdis (ნახვამდის) — goodbye. Georgian is a Kartvelian language — not Indo-European.",
        },
        {
          id: ensureId("slide"),
          title: "Starter grammar pitfall",
          body: "Georgian verbs mark the subject with suffixes; word order is flexible but SOV is common. Pitfall: assuming 1:1 English word order. Takeaway: learn letter–sound pairs first, then phrase chunks.",
        },
      ],
    };
  }

  return {
    type: "slideshow",
    estimated_minutes: 5,
    slides: [
      {
        id: ensureId("slide"),
        title: `${clean}: core definition`,
        body: `Define ${clean} with one precise sentence, one numeric or named example, and one sentence on why it matters in practice.`,
      },
      {
        id: ensureId("slide"),
        title: `${clean}: worked example`,
        body: `Walk through a 3-step example specific to ${clean}. Each step must name concrete terms, values, or actions — no generic study advice.`,
      },
      {
        id: ensureId("slide"),
        title: `${clean}: pitfalls & recap`,
        body: `List two common mistakes learners make with ${clean} and the correct idea in one line each. End with three bullet-sized facts the learner should remember.`,
      },
    ],
  };
}

function fallbackLessonPayload(
  topic: string,
  format: LessonFormat,
): LessonContentPayload {
  switch (format) {
    case "cheat_sheet":
      return {
        type: "cheat_sheet",
        markdown: `# ${topic}\n\n## Overview\n\nKey ideas about **${topic}** will appear here once generation succeeds.\n\n## Steps\n\n1. Start with the basics.\n2. Practice with a simple example.\n3. Review what you learned.`,
        key_takeaways: [
          `You can learn ${topic} in small, steady steps.`,
          "Focus on one concept at a time.",
        ],
      };
    case "quiz":
      return {
        type: "quiz",
        questions: [
          {
            id: ensureId("q"),
            prompt: `What is the main goal when studying "${topic}"?`,
            choices: [
              "Memorize without understanding",
              "Build understanding step by step",
              "Skip fundamentals",
            ],
            correct_index: 1,
            hint: "Gal-zu favors steady, supportive learning.",
            explanation: "Understanding builds durable knowledge.",
          },
        ],
        passing_score_percent: 70,
      };
    case "script":
      return {
        type: "script",
        markdown: `# ${topic}\n\nWelcome. Today we explore **${topic}** at a comfortable pace.`,
      };
    case "slideshow":
    default:
      return padSlideDeck(fallbackSlideshow(topic), 5);
  }
}

/**
 * Classifies learner intent, builds a roadmap, and plans the first lesson.
 */
export async function classifyAndBuildRoadmap(
  topic: string,
  profile: UserProfile,
  context?: GeminiGenerationContext,
): Promise<CourseClassificationResult> {
  const cleanTopic = sanitizeLearnerTopic(topic);
  if (!cleanTopic) {
    throw new GeminiEngineError("Prompt cannot be empty.");
  }

  const scopeHints = buildScopeHints(context);

  const systemInstruction = `${EDUCATOR_SYSTEM_PREAMBLE}

You are Gal-zu, an adaptive learning architect planning courses.
Return ONLY valid JSON matching this shape:
{
  "scope_type": "micro" | "unit" | "macro",
  "title": string,
  "description": string,
  "roadmap_tree": { "version": 1, "phases": [...] },
  "first_lesson": { "title": string, "topic": string, "format": "slideshow"|"cheat_sheet"|"quiz"|"script" }
}

CRITICAL TITLE RULES:
- "title" MUST be a short course name derived ONLY from the learner topic (max ~8 words).
- NEVER include depth/time strings, colons about preferences, or metadata in title/topic fields.
- "first_lesson.topic" MUST equal the clean learner topic exactly.

Scope rules:
- quick_answer depth: scope_type MUST be "micro" (one lesson path, 5–6 slides).
- complete_mastery depth: scope_type MUST be "macro" with 4–6 modules across multiple phases (e.g., alphabet, greetings, grammar, verbs). Each module needs a specific title.
- unit: ~1 week path
${buildProfileAdaptationInstructions(profile)}`;

  const userPrompt = [
    `Learner topic (canonical): "${cleanTopic}"`,
    scopeHints ? `Planning constraints:\n${scopeHints}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const payload = await generateStructuredJson(
      systemInstruction,
      userPrompt,
      courseClassificationSchema,
    );

    const validated = courseClassificationSchema.parse(payload);

    const scaled = applyScopeScaling(
      {
        scope_type: validated.scope_type,
        title: sanitizeCourseText(validated.title),
        description: sanitizeCourseText(validated.description),
        roadmap_tree: normalizeRoadmapTree(
          validated.roadmap_tree,
          sanitizeCourseText(validated.title),
        ),
        first_lesson: {
          ...validated.first_lesson,
          title: sanitizeCourseText(validated.first_lesson.title),
          topic:
            sanitizeLearnerTopic(validated.first_lesson.topic) || cleanTopic,
        },
      },
      cleanTopic,
      context,
    );

    return scaled;
  } catch (error) {
    console.error("[gemini] classifyAndBuildRoadmap fallback:", error);
    return fallbackClassification(cleanTopic, context);
  }
}

/**
 * Generates interactive lesson JSON adapted to the learner profile.
 */
export async function generateLessonPayload(
  topic: string,
  format: LessonFormat,
  profile: UserProfile,
  context?: string,
  slideTarget?: { min: number; max: number },
): Promise<LessonContentPayload> {
  const trimmedTopic = sanitizeLearnerTopic(topic);
  if (!trimmedTopic) {
    throw new GeminiEngineError("Lesson topic cannot be empty.");
  }

  const schema = lessonPayloadSchemaForFormat(format);

  const slideMin = slideTarget?.min ?? 5;
  const slideMax = slideTarget?.max ?? 8;

  const systemInstruction = `${EDUCATOR_SYSTEM_PREAMBLE}

Return ONLY valid JSON for format "${format}".

slideshow: { "type":"slideshow", "slides":[...] } — EXACTLY ${slideMin} to ${slideMax} slides.
  Slide 1: Core concept & foundations (definitions, formulas, or key terms)
  Slide 2: Real-world examples / vocabulary & pronunciation / worked numbers
  Slide 3: Interactive practice / step-by-step breakdown
  Slide 4: Nuance, grammar rules, or advanced edge cases
  Slide 5+: Common pitfalls, key takeaways & memory tricks (specific facts only)

cheat_sheet | quiz | script: factual, topic-specific content only.

Use unique string slide/question ids.
${buildProfileAdaptationInstructions(profile)}`;

  const userPrompt = [
    `Lesson topic (canonical): "${trimmedTopic}"`,
    context ? `Course context:\n${context}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const payload = await generateStructuredJson(
      systemInstruction,
      userPrompt,
      schema,
    );
    const parsed = schema.parse(payload) as ValidatedLessonPayload;
    if (parsed.type === "slideshow") {
      return padSlideDeck(parsed, slideMin);
    }
    return parsed;
  } catch (error) {
    console.error("[gemini] generateLessonPayload fallback:", error);
    const fallback = fallbackLessonPayload(trimmedTopic, format);
    if (fallback.type === "slideshow") {
      return padSlideDeck(fallback, slideMin);
    }
    return fallback;
  }
}

export { MODEL_CANDIDATES as GEMINI_MODEL_CANDIDATES };

/** Short adaptive hint when a quiz answer is incorrect. */
export async function generateQuizHint(
  questionPrompt: string,
  selectedChoice: string,
  profile: UserProfile,
): Promise<string> {
  const ai = getGeminiClient();
  const systemInstruction = `You are a supportive tutor. Reply in 1-2 short sentences. No markdown.
${buildProfileAdaptationInstructions(profile)}`;

  const userPrompt = `Question: ${questionPrompt}
Learner chose: ${selectedChoice}
Give a gentle hint that nudges toward the right idea without revealing the exact answer letter.`;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
        config: { temperature: 0.5, maxOutputTokens: 120 },
      });
      const text = response.text?.trim();
      if (text) return text;
    } catch {
      continue;
    }
  }

  return "Take another look at the question — which option best matches the core idea?";
}
