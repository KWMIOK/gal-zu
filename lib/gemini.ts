import "server-only";

import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";
import type { z } from "zod";

import { ANIMATION_TAGS } from "@/lib/animations/lottie-map";
import { getServerEnv } from "@/lib/env";
import { parseJsonUnknown } from "@/lib/gemini/json";
import {
  buildScopeHints,
  sanitizeCourseText,
  sanitizeLearnerTopic,
  type GeminiGenerationContext,
} from "@/lib/generation/prompt";
import {
  DEPTH_TIER_CONFIG,
  ensureRoadmapScale,
  resolveDepthTier,
} from "@/lib/gemini/lesson-plans";
import {
  courseClassificationSchema,
  lessonPayloadSchemaForFormat,
  type ValidatedLessonPayload,
} from "@/lib/gemini/schemas";
import type {
  Citation,
  LessonContentPayload,
  LessonFormat,
  RoadmapModule,
  RoadmapPhase,
  RoadmapTree,
  ScopeType,
  SlideContent,
  UserProfile,
} from "@/types/database";

// "gemini-2.5-flash" / "gemini-2.0-flash" / "gemini-1.5-flash" are dead for
// new API keys (404 "no longer available to new users") or hard-quota-
// blocked (429, limit: 0) on the free tier — confirmed live against the
// Gemini API on 2026-07-18. The "-latest" aliases below always point at
// whatever the current non-deprecated flash model is, so this list won't
// silently rot again the same way.
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeGenerationError(error: unknown): string {
  return error instanceof GeminiEngineError
    ? error.message
    : error instanceof Error
      ? error.message
      : String(error);
}

function extractHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

// A model is retried this many times before moving on to the next
// candidate — there is no synchronous time budget to protect anymore (see
// lib/generation/lazy.ts: lessons generate lazily, one at a time), so it's
// worth paying the extra latency to actually get real content instead of
// giving up after a single transient failure (a schema miss, a flaky 500,
// a JSON hiccup) and masking it with placeholder filler.
const MAX_ATTEMPTS_PER_MODEL = 3;
const RETRY_DELAY_MS = [2000, 6000];

/**
 * Calls Gemini for one structured-JSON generation, retrying transient
 * failures across every model in `MODEL_CANDIDATES`. Never falls back to
 * placeholder content on its own — if every model/attempt genuinely fails,
 * it throws a `GeminiEngineError` whose message lists *every* attempt's
 * real failure reason (model, attempt number, schema/API/empty-response
 * detail), so a failure is visible and diagnosable end-to-end instead of
 * silently degrading into generic filler that looks like success.
 */
async function generateStructuredJson(
  systemInstruction: string,
  userPrompt: string,
  schema: z.ZodType,
): Promise<unknown> {
  const ai = getGeminiClient();
  const failures: string[] = [];

  for (const model of MODEL_CANDIDATES) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
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
        const reason = describeGenerationError(error);
        failures.push(`${model} attempt ${attempt}/${MAX_ATTEMPTS_PER_MODEL}: ${reason.slice(0, 500)}`);
        console.warn(`[gemini] generateStructuredJson failed — ${failures[failures.length - 1]}`);

        const status = extractHttpStatus(error);
        // A 429 on attempt 1 is almost always an account-wide quota/billing
        // block, not a fluke — retrying the *same* model won't help, so
        // move straight to the next candidate instead of burning 2 more
        // doomed attempts and multiple retry delays.
        if (status === 429) break;

        if (attempt < MAX_ATTEMPTS_PER_MODEL) {
          await sleep(RETRY_DELAY_MS[attempt - 1] ?? 6000);
        }
      }
    }
  }

  throw new GeminiEngineError(
    `All Gemini model attempts failed:\n${failures.join("\n")}`,
  );
}

type GroundingResult = {
  briefing: string;
  citations: Citation[];
};

/**
 * Pass 1 of a two-pass grounding pipeline.
 *
 * The Gemini API does not reliably support combining the `googleSearch`
 * tool with `responseMimeType: "application/json"` / `responseSchema` on
 * the model family this app targets (2.5/2.0/1.5 flash) — depending on the
 * model it either rejects the request with a 400 `INVALID_ARGUMENT`
 * ("controlled generation is not supported with google_search tool") or
 * silently drops `groundingMetadata` and answers from parametric memory.
 * Long signed source URLs are also prone to token-level corruption if the
 * model has to *retype* them inside JSON.
 *
 * So instead: fetch grounded facts as plain prose here (tools enabled, no
 * schema), pull real citation URLs straight from `groundingMetadata`
 * ourselves, and feed the prose + citation list into pass 2's structured
 * JSON prompt as verified research context. Best-effort — returns `null`
 * on failure so lesson generation degrades gracefully instead of failing.
 *
 * NOTE: Google Search grounding requires a billing-enabled Google AI
 * Studio / Cloud project — on the free tier it returns 429
 * `RESOURCE_EXHAUSTED` regardless of which model is used. That failure is
 * account-wide, not model-specific, so we stop retrying other candidates
 * immediately instead of burning 3 doomed calls on every lesson.
 */
async function groundedResearch(topic: string): Promise<GroundingResult | null> {
  const ai = getGeminiClient();

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Use Google Search to gather accurate, current facts about: "${topic}".
Write a dense factual briefing (short paragraphs or bullets) covering real definitions, numbers, vocabulary, dates, or mechanics a learner would need. No meta-commentary or filler — facts only.`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.2,
          tools: [{ googleSearch: {} }],
        },
      });

      const briefing = response.text?.trim();
      if (!briefing) continue;

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const seen = new Set<string>();
      const citations: Citation[] = [];
      for (const chunk of chunks) {
        const url = chunk.web?.uri;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        citations.push({ title: chunk.web?.title || url, url });
      }

      return { briefing, citations };
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status: unknown }).status
          : undefined;
      console.warn(`[gemini] groundedResearch failed for model ${model}:`, error);
      if (status === 429) {
        console.warn(
          "[gemini] Grounding quota exhausted (needs a billing-enabled AI Studio project) — skipping remaining models for this call.",
        );
        return null;
      }
    }
  }

  return null;
}

function ensureId(prefix: string, value?: string): string {
  return value && value.trim().length > 0 ? value : `${prefix}_${randomUUID()}`;
}

/** Accepts Gemini's raw (id-less) roadmap shape as well as an already-normalized one. */
type LenientRoadmapModule = Omit<RoadmapModule, "id"> & { id?: string };
type LenientRoadmapPhase = Omit<RoadmapPhase, "id" | "modules"> & {
  id?: string;
  modules: LenientRoadmapModule[];
};
type LenientRoadmapTree = Omit<RoadmapTree, "phases"> & { phases: LenientRoadmapPhase[] };

export function normalizeRoadmapTree(
  tree: LenientRoadmapTree,
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

function padSlideDeck(content: SlideContent, minSlides: number): SlideContent {
  const slides = [...content.slides];
  let n = slides.length;
  while (n < minSlides) {
    const text =
      "Consolidate prior slides: name one fact, one example, and one pitfall to remember before moving on.";
    slides.push({
      id: ensureId("slide"),
      title: `Takeaway ${n + 1}`,
      text_content: text,
      spoken_narration: text,
      animation_prompt: "success_checkmark",
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
  const tier = resolveDepthTier(context);
  if (tier === "quick_answer") {
    return { ...result, scope_type: "micro" };
  }

  const config = DEPTH_TIER_CONFIG[tier];
  return {
    ...result,
    scope_type: config.scopeType,
    roadmap_tree: ensureRoadmapScale(result.roadmap_tree, cleanTopic, config),
  };
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
  "roadmap_tree": {
    "version": 1,
    "phases": [
      {
        "title": string,
        "description": string (optional, 1 sentence on what this phase covers),
        "modules": [
          { "title": string, "description": string (optional), "estimated_minutes": number (optional) },
          ...
        ]
      },
      ...
    ]
  },
  "first_lesson": { "title": string, "topic": string, "format": "slideshow"|"cheat_sheet"|"quiz"|"script" }
}
Do NOT include "id" fields anywhere in roadmap_tree — the app generates those itself.

CRITICAL TITLE RULES:
- "title" MUST be a short course name derived ONLY from the learner topic (max ~8 words).
- NEVER include depth/time strings, colons about preferences, or metadata in title/topic fields.
- "first_lesson.topic" MUST equal the clean learner topic exactly.

CRITICAL — MAKE THE ROADMAP TOPIC-SPECIFIC, NOT GENERIC:
- Every phase/module title MUST reference concrete subject matter of "${cleanTopic}" itself — never generic
  placeholders like "Introduction to X", "Core lesson", "Fundamentals", or "Getting started". Name the actual
  sub-topics a real curriculum would cover (e.g. for a language: specific grammar tenses, specific vocab
  categories, specific script/phonetics milestones; for a science topic: specific laws/theorems/mechanisms).

Scope rules (four depth tiers — pick modules WITHIN the given range based on how much a real curriculum on
"${cleanTopic}" specifically needs, not always the same count regardless of topic):
- quick_answer: scope_type "micro" — still ONE lesson/module, but its title must name the specific angle this
  single lesson takes on "${cleanTopic}" (not just "Introduction to <topic>" restated).
- overview: scope_type "unit" — 2 to 4 modules. Use the low end for genuinely narrow topics (e.g. one theorem, one
  historical event) and the high end for topics with several distinct sub-areas.
- deep_dive: scope_type "unit" — 4 to 7 modules covering the topic properly, including nuance and practice.
- complete_mastery: scope_type "macro" — 5 to 14 modules across multiple phases. A narrow topic (e.g. "the
  Pythagorean theorem") should still land near the low end even at this tier; a genuinely vast topic (e.g. "learn
  Japanese from scratch", "master calculus") should use significantly more of the range — a whole language or field
  cannot be honestly covered in 5 modules, so do not default there just because it's a round number. Every module
  needs a distinct, concrete, topic-specific title/description reflecting real curriculum progression.
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
    // Used to catch-and-substitute a generic "Introduction to X" roadmap
    // here, indistinguishable from a real successful classification — that
    // silent masking is exactly what produced repeated/generic-feeling
    // courses whenever the underlying calls were actually failing. Let the
    // real, detailed error (see generateStructuredJson) propagate instead.
    if (error instanceof GeminiEngineError) {
      throw error;
    }
    throw new GeminiEngineError(
      `classifyAndBuildRoadmap failed for "${cleanTopic}": ${describeGenerationError(error)}`,
      error,
    );
  }
}

const SLIDESHOW_MULTIMODAL_RULES = `
Every slide object MUST include these fields:
- "id": unique string
- "title": string
- "text_content": the primary educational text (what earlier prompts called "body") — dense, factual, on-topic
- "spoken_narration": a warm, conversational script written to be read aloud by Text-to-Speech. It should
  narrate/explain the slide's idea in natural spoken sentences — NOT a verbatim copy of "text_content" (no bullet
  fragments, no bracket notation, no equations-as-symbols; spell out numbers/operators if relevant). If the slide
  contains non-Latin script, "spoken_narration" must describe how it sounds in words (e.g. "pronounced ahlan") —
  never just repeat the raw glyphs, since a screen reader cannot pronounce them.
- "animation_prompt": pick the closest match from this list based on the slide's mood/content: ${ANIMATION_TAGS.join(", ")}.

LANGUAGE-LEARNING TOPICS (e.g. "Arabic", "Georgian", "Japanese", any specific language name): this is the highest-
value case, treat it like Duolingo's own curriculum, not a Wikipedia summary:
- Actually WRITE the target language's native script/characters inline in "text_content" (and, where natural,
  "callout") — e.g. real Arabic letters (ا ب ت), real Hangul, real Hanzi/Kanji — never transliteration-only, never a
  generic "here's how alphabets work" description with zero characters from the actual language.
- Pair every native-script term with its transliteration AND English meaning, e.g. "مرحبا (marhaban) — hello".
- Include actual phonetic/pronunciation guidance (IPA or plain-English approximation) for at least one slide.
- Prefer 2-3 "interactive_widget" slides over just one (see below) so vocabulary gets genuine repeated practice,
  the way a Duolingo lesson drills a small word set from multiple angles.

Optional fields:
- "callout", "visual_hint", "speaker_notes": as before.
- "interactive_widget": add this to 1-3 slides in the deck (ideally the practice/application slides), never more
  than one widget per slide. Two mini-game types are supported — mix them for variety on language/vocab-heavy
  topics instead of repeating the same one:
  1. "match_pairs": { "type": "match_pairs", "prompt": string, "data": [{ "id": string, "left": string, "right": string }, ...(2-6 pairs)] }
  2. "multiple_choice": { "type": "multiple_choice", "prompt": string, "data": { "question": string, "options": [{ "id": string, "text": string }, ...(3-5 options)], "correct_option_id": string, "explanation": string } }
  Content must be genuinely topic-specific (real vocabulary↔translation, term↔definition, step↔result, or a real
  comprehension question) — never generic placeholders. Slides without a widget MUST omit "interactive_widget"
  entirely.
- Never invent citation URLs yourself — those are attached separately from verified sources.`;

/**
 * Generates interactive lesson JSON adapted to the learner profile.
 *
 * `ragContext`, when non-empty, is verified reference material (see
 * `fetchTrustedRagContext` in `lib/db/index.ts`) that should be preferred
 * over the model's own memory or live search.
 */
export async function generateLessonPayload(
  topic: string,
  format: LessonFormat,
  profile: UserProfile,
  context?: string,
  slideTarget?: { min: number; max: number },
  ragContext?: string,
): Promise<LessonContentPayload> {
  const trimmedTopic = sanitizeLearnerTopic(topic);
  if (!trimmedTopic) {
    throw new GeminiEngineError("Lesson topic cannot be empty.");
  }

  const schema = lessonPayloadSchemaForFormat(format);

  const slideMin = slideTarget?.min ?? 5;
  const slideMax = slideTarget?.max ?? 8;

  // Grounding is only worth the extra round-trip for the rich, multi-slide
  // format this phase is about — quiz/cheat_sheet/script stay single-pass.
  const grounding =
    format === "slideshow" ? await groundedResearch(trimmedTopic) : null;

  const systemInstruction = `${EDUCATOR_SYSTEM_PREAMBLE}

Return ONLY valid JSON for format "${format}".

slideshow: { "type":"slideshow", "slides":[...] } — EXACTLY ${slideMin} to ${slideMax} slides.
  Slide 1: Core concept & foundations (definitions, formulas, or key terms)
  Slide 2: Real-world examples / vocabulary & pronunciation / worked numbers
  Slide 3: Interactive practice / step-by-step breakdown
  Slide 4: Nuance, grammar rules, or advanced edge cases
  Slide 5+: Common pitfalls, key takeaways & memory tricks (specific facts only)
${format === "slideshow" ? SLIDESHOW_MULTIMODAL_RULES : ""}

cheat_sheet | quiz | script: factual, topic-specific content only.

Use unique string slide/question ids.
${buildProfileAdaptationInstructions(profile)}`;

  const userPrompt = [
    `Lesson topic (canonical): "${trimmedTopic}"`,
    context ? `Course context:\n${context}` : null,
    ragContext ? `Verified trusted-source context (prefer this over general knowledge):\n${ragContext}` : null,
    grounding
      ? `Verified research from Google Search (base facts on this; do not restate URLs verbatim):\n${grounding.briefing}`
      : null,
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
      const padded = padSlideDeck(parsed, slideMin);
      return grounding?.citations.length
        ? { ...padded, citations: grounding.citations }
        : padded;
    }
    return parsed;
  } catch (error) {
    // Used to catch-and-substitute generic placeholder content here (a
    // fixed 3-slide "core definition / worked example / pitfalls" deck),
    // indistinguishable from real generated content once rendered — that's
    // exactly what caused lessons to look useless/repeated whenever
    // generation was actually failing underneath. Let the real, detailed
    // error (see generateStructuredJson) propagate all the way to the
    // caller instead, so the lesson page can show it and it's actually
    // fixable rather than invisible.
    if (error instanceof GeminiEngineError) {
      throw error;
    }
    throw new GeminiEngineError(
      `generateLessonPayload failed for "${trimmedTopic}" (${format}): ${describeGenerationError(error)}`,
      error,
    );
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
