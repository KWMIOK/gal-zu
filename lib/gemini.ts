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
      console.warn(`[gemini] groundedResearch failed for model ${model}:`, error);
    }
  }

  return null;
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
          text_content:
            "1 + 1 means one unit combined with one unit. In set terms: {●} ∪ {●} has cardinality 2. Equation: 1 + 1 = 2.",
          spoken_narration:
            "One plus one means combining one thing with one more thing. If you have one dot, and you add one more dot, you now have two dots. That's the equation one plus one equals two.",
          callout: "Binary: 1₂ + 1₂ = 10₂ (which is 2 in decimal).",
          animation_prompt: "bouncing_math_equation",
        },
        {
          id: ensureId("slide"),
          title: "Number line & counting",
          text_content: "Start at 1, move +1 step → you land on 2. Visually: • + • = ••.",
          spoken_narration:
            "Picture a number line. Start on one. Take one step forward. Now you're standing on two.",
          visual_hint: "Count aloud: one … two.",
          animation_prompt: "bouncing_math_equation",
        },
        {
          id: ensureId("slide"),
          title: "Practice: match the equation",
          text_content: "Match each expression to its correct value before moving on.",
          spoken_narration: "Let's practice. Match each equation on the left to its correct answer on the right.",
          animation_prompt: "thinking",
          interactive_widget: {
            type: "match_pairs",
            prompt: "Match each equation to its value:",
            data: [
              { id: "m1", left: "1 + 1", right: "2" },
              { id: "m2", left: "1₂ + 1₂ (binary)", right: "10₂" },
              { id: "m3", left: "2 − 1", right: "1" },
            ],
          },
        },
        {
          id: ensureId("slide"),
          title: "Pitfalls & takeaways",
          text_content:
            "Common mistake: treating '+' as concatenation (1+1 ≠ 11). Takeaway: '+' always means add quantities, so 1+1=2.",
          spoken_narration:
            "A common mistake is reading one plus one as if it were the number eleven. Remember: the plus sign always means add quantities together, so one plus one equals two.",
          animation_prompt: "success_checkmark",
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
          text_content:
            "Modern Georgian uses Mkhedruli: 33 letters, no uppercase. Example letters: ა (a), ბ (b), გ (g), დ (d), ე (e).",
          spoken_narration:
            "Modern Georgian is written in the Mkhedruli script, which has thirty-three letters and no uppercase forms. Here are a few: ah, buh, guh, duh, eh.",
          callout: "Gamarjoba (გამარჯობა) = Hello.",
          animation_prompt: "lightbulb_idea",
        },
        {
          id: ensureId("slide"),
          title: "First words & pronunciation",
          text_content:
            "Gamarjoba [gɑmɑrdʒɔbɑ] — hello. Madloba (მადლობა) — thank you. Nakhvamdis (ნახვამდის) — goodbye. Georgian is a Kartvelian language — not Indo-European.",
          spoken_narration:
            "Gamarjoba means hello. Madloba means thank you. Nakhvamdis means goodbye. Georgian belongs to the Kartvelian language family, unrelated to English.",
          animation_prompt: "thinking",
        },
        {
          id: ensureId("slide"),
          title: "Practice: match the words",
          text_content: "Match each Georgian word to its English meaning.",
          spoken_narration: "Time to practice. Match each Georgian word to its English translation.",
          animation_prompt: "thinking",
          interactive_widget: {
            type: "match_pairs",
            prompt: "Match the Georgian word to its meaning:",
            data: [
              { id: "g1", left: "Gamarjoba", right: "Hello" },
              { id: "g2", left: "Madloba", right: "Thank you" },
              { id: "g3", left: "Nakhvamdis", right: "Goodbye" },
            ],
          },
        },
        {
          id: ensureId("slide"),
          title: "Starter grammar pitfall",
          text_content:
            "Georgian verbs mark the subject with suffixes; word order is flexible but SOV is common. Pitfall: assuming 1:1 English word order. Takeaway: learn letter–sound pairs first, then phrase chunks.",
          spoken_narration:
            "Georgian verbs mark who's doing the action with suffixes, and word order is flexible, though subject-object-verb is common. Don't assume English word order maps directly — learn letter-sound pairs first, then whole phrases.",
          animation_prompt: "success_checkmark",
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
        text_content: `Define ${clean} with one precise sentence, one numeric or named example, and one sentence on why it matters in practice.`,
        spoken_narration: `Let's define ${clean} in one clear sentence, walk through a concrete example, and see why it actually matters.`,
        animation_prompt: "lightbulb_idea",
      },
      {
        id: ensureId("slide"),
        title: `${clean}: worked example`,
        text_content: `Walk through a 3-step example specific to ${clean}. Each step must name concrete terms, values, or actions — no generic study advice.`,
        spoken_narration: `Now let's work through a step by step example of ${clean}, using real terms and values at every step.`,
        animation_prompt: "thinking",
      },
      {
        id: ensureId("slide"),
        title: `${clean}: pitfalls & recap`,
        text_content: `List two common mistakes learners make with ${clean} and the correct idea in one line each. End with three bullet-sized facts the learner should remember.`,
        spoken_narration: `Here are the most common mistakes learners make with ${clean}, and the three key facts worth remembering.`,
        animation_prompt: "success_checkmark",
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

const SLIDESHOW_MULTIMODAL_RULES = `
Every slide object MUST include these fields:
- "id": unique string
- "title": string
- "text_content": the primary educational text (what earlier prompts called "body") — dense, factual, on-topic
- "spoken_narration": a warm, conversational script written to be read aloud by Text-to-Speech. It should
  narrate/explain the slide's idea in natural spoken sentences — NOT a verbatim copy of "text_content" (no bullet
  fragments, no bracket notation, no equations-as-symbols; spell out numbers/operators if relevant).
- "animation_prompt": pick the closest match from this list based on the slide's mood/content: ${ANIMATION_TAGS.join(", ")}.

Optional fields:
- "callout", "visual_hint", "speaker_notes": as before.
- "interactive_widget": add this to EXACTLY ONE slide in the deck (ideally the practice/application slide) — a
  Duolingo-style "match_pairs" mini-game:
  { "type": "match_pairs", "prompt": string, "data": [{ "id": string, "left": string, "right": string }, ...(2-6 pairs)] }
  Pairs must be genuinely topic-specific (e.g. vocabulary↔translation, term↔definition, step↔result) — never generic
  placeholders. Every other slide MUST omit "interactive_widget" entirely.
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
    console.error("[gemini] generateLessonPayload fallback:", error);
    const fallback = fallbackLessonPayload(trimmedTopic, format);
    if (fallback.type === "slideshow") {
      const padded = padSlideDeck(fallback, slideMin);
      return grounding?.citations.length
        ? { ...padded, citations: grounding.citations }
        : padded;
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
