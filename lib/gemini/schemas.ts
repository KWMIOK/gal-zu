import { z } from "zod";

export const scopeTypeSchema = z.enum(["micro", "unit", "macro"]);

export const lessonFormatSchema = z.enum([
  "slideshow",
  "cheat_sheet",
  "quiz",
  "script",
]);

export const roadmapModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  estimated_minutes: z.number().int().positive().optional(),
  order: z.number().int().nonnegative().optional(),
  lesson_ids: z.array(z.string()).optional(),
});

export const roadmapPhaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  estimated_weeks: z.number().positive().optional(),
  order: z.number().int().nonnegative().optional(),
  modules: z.array(roadmapModuleSchema).min(1),
});

export const roadmapTreeSchema = z.object({
  version: z.literal(1),
  phases: z.array(roadmapPhaseSchema).min(1),
  total_estimated_hours: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const firstLessonPlanSchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  format: lessonFormatSchema,
});

export const courseClassificationSchema = z.object({
  scope_type: scopeTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  roadmap_tree: roadmapTreeSchema,
  first_lesson: firstLessonPlanSchema,
});

export const matchPairItemSchema = z.object({
  id: z.string().min(1),
  left: z.string().min(1),
  right: z.string().min(1),
});

export const multipleChoiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const multipleChoiceWidgetDataSchema = z.object({
  question: z.string().min(1),
  options: z.array(multipleChoiceOptionSchema).min(3).max(5),
  correct_option_id: z.string().min(1),
  explanation: z.string().optional(),
});

const matchPairsWidgetSchema = z.object({
  type: z.literal("match_pairs"),
  prompt: z.string().optional(),
  data: z.array(matchPairItemSchema).min(2).max(6),
});

const multipleChoiceWidgetSchema = z.object({
  type: z.literal("multiple_choice"),
  prompt: z.string().optional(),
  data: multipleChoiceWidgetDataSchema,
});

/** Duolingo-style mini-games gating slide progression until solved. */
export const interactiveWidgetSchema = z.discriminatedUnion("type", [
  matchPairsWidgetSchema,
  multipleChoiceWidgetSchema,
]);

export const citationSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
});

export const slideSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text_content: z.string().min(1),
  callout: z.string().optional(),
  visual_hint: z.string().optional(),
  speaker_notes: z.string().optional(),
  /** Conversational TTS script — distinct from `text_content`, which is read visually. */
  spoken_narration: z.string().min(1),
  /** Semantic tag used to pick a Lottie animation on the frontend. */
  animation_prompt: z.string().optional(),
  interactive_widget: interactiveWidgetSchema.optional(),
});

export const slideContentSchema = z.object({
  type: z.literal("slideshow"),
  slides: z.array(slideSchema).min(5).max(8),
  estimated_minutes: z.number().int().positive().optional(),
  /** Populated from real Google Search grounding metadata, not model-generated. */
  citations: z.array(citationSchema).optional(),
});

export const cheatSheetContentSchema = z.object({
  type: z.literal("cheat_sheet"),
  markdown: z.string().min(1),
  key_takeaways: z.array(z.string().min(1)).min(1),
});

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2),
  correct_index: z.number().int().nonnegative(),
  hint: z.string().optional(),
  explanation: z.string().optional(),
});

export const quizContentSchema = z.object({
  type: z.literal("quiz"),
  questions: z.array(quizQuestionSchema).min(1),
  passing_score_percent: z.number().int().min(0).max(100).optional(),
});

export const scriptContentSchema = z.object({
  type: z.literal("script"),
  markdown: z.string().min(1),
});

export type CourseClassificationPayload = z.infer<
  typeof courseClassificationSchema
>;

export type ValidatedLessonPayload =
  | z.infer<typeof slideContentSchema>
  | z.infer<typeof cheatSheetContentSchema>
  | z.infer<typeof quizContentSchema>
  | z.infer<typeof scriptContentSchema>;

export function lessonPayloadSchemaForFormat(format: z.infer<typeof lessonFormatSchema>) {
  switch (format) {
    case "slideshow":
      return slideContentSchema;
    case "cheat_sheet":
      return cheatSheetContentSchema;
    case "quiz":
      return quizContentSchema;
    case "script":
      return scriptContentSchema;
    default:
      return slideContentSchema;
  }
}
