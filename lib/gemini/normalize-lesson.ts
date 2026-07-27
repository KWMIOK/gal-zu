/**
 * Gemini often invents alternate quiz field names (question/options instead of
 * prompt/choices, letter answers instead of correct_index). Normalize those
 * aliases before Zod validation — never invent quiz content, only reshape
 * what the model already returned.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function choiceText(value: unknown): string | undefined {
  if (typeof value === "string") return asNonEmptyString(value);
  const record = asRecord(value);
  if (!record) return undefined;
  return (
    asNonEmptyString(record.text) ??
    asNonEmptyString(record.label) ??
    asNonEmptyString(record.value) ??
    asNonEmptyString(record.choice) ??
    asNonEmptyString(record.option)
  );
}

function normalizeChoices(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const choices = raw
    .map(choiceText)
    .filter((text): text is string => Boolean(text));
  return choices.length >= 2 ? choices : undefined;
}

function letterToIndex(letter: string): number | undefined {
  const trimmed = letter.trim();
  if (/^[A-Za-z]$/.test(trimmed)) {
    return trimmed.toUpperCase().charCodeAt(0) - 65;
  }
  if (/^[1-9]$/.test(trimmed)) {
    return Number(trimmed) - 1;
  }
  return undefined;
}

function resolveCorrectIndex(
  raw: Record<string, unknown>,
  choices: string[] | undefined,
): number | undefined {
  const direct =
    raw.correct_index ??
    raw.correctIndex ??
    raw.answer_index ??
    raw.answerIndex ??
    raw.correct;
  if (typeof direct === "number" && Number.isFinite(direct)) {
    return Math.trunc(direct);
  }
  if (typeof direct === "string") {
    const asNum = Number(direct);
    if (Number.isFinite(asNum)) return Math.trunc(asNum);
    const fromLetter = letterToIndex(direct);
    if (fromLetter !== undefined) return fromLetter;
  }

  const optionId =
    asNonEmptyString(raw.correct_option_id) ??
    asNonEmptyString(raw.correctOptionId) ??
    asNonEmptyString(raw.answer_id);
  if (optionId && Array.isArray(raw.options)) {
    const idx = raw.options.findIndex((option) => {
      const record = asRecord(option);
      return record && asNonEmptyString(record.id) === optionId;
    });
    if (idx >= 0) return idx;
  }

  const answerText =
    asNonEmptyString(raw.correct_answer) ??
    asNonEmptyString(raw.correctAnswer) ??
    asNonEmptyString(raw.answer);
  if (answerText && choices) {
    const fromLetter = letterToIndex(answerText);
    if (
      fromLetter !== undefined &&
      fromLetter >= 0 &&
      fromLetter < choices.length
    ) {
      return fromLetter;
    }
    const idx = choices.findIndex(
      (choice) => choice.toLowerCase() === answerText.toLowerCase(),
    );
    if (idx >= 0) return idx;
  }

  return undefined;
}

function normalizeQuizQuestion(raw: unknown): unknown {
  const record = asRecord(raw);
  if (!record) return raw;

  const prompt =
    asNonEmptyString(record.prompt) ??
    asNonEmptyString(record.question) ??
    asNonEmptyString(record.text) ??
    asNonEmptyString(record.stem) ??
    asNonEmptyString(record.q);

  const choices =
    normalizeChoices(record.choices) ??
    normalizeChoices(record.options) ??
    normalizeChoices(record.answers) ??
    normalizeChoices(record.answer_choices);

  const correct_index = resolveCorrectIndex(record, choices);

  const out: Record<string, unknown> = {};
  const id = asNonEmptyString(record.id);
  if (id) out.id = id;
  if (prompt) out.prompt = prompt;
  if (choices) out.choices = choices;
  if (correct_index !== undefined) out.correct_index = correct_index;
  const hint = asNonEmptyString(record.hint);
  if (hint) out.hint = hint;
  const explanation =
    asNonEmptyString(record.explanation) ??
    asNonEmptyString(record.rationale);
  if (explanation) out.explanation = explanation;
  return out;
}

/**
 * Coerce a raw Gemini quiz JSON object into the Gal-zu quiz shape.
 * Returns the input unchanged when it isn't an object.
 */
export function normalizeQuizPayload(raw: unknown): unknown {
  const record = asRecord(raw);
  if (!record) return raw;

  const typeRaw = asNonEmptyString(record.type);
  const type =
    typeRaw && typeRaw.toLowerCase().replace(/[\s-]+/g, "_") === "quiz"
      ? "quiz"
      : typeRaw;

  const questionsRaw =
    record.questions ??
    record.quiz_questions ??
    record.quizQuestions ??
    record.items ??
    record.problems;

  const questions = Array.isArray(questionsRaw)
    ? questionsRaw.map(normalizeQuizQuestion)
    : questionsRaw;

  return {
    ...record,
    ...(type ? { type } : { type: "quiz" }),
    ...(questions !== undefined ? { questions } : {}),
  };
}
