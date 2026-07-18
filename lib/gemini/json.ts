/** Extract and parse JSON from Gemini text (handles fenced code blocks). */
export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

/**
 * Gemini frequently emits a literal newline/tab byte inside a JSON string
 * value (e.g. a numbered list packed into "text_content") instead of the
 * escaped "\n" sequence. Strict JSON.parse rejects raw control characters
 * inside string literals ("Bad control character in string literal"), which
 * was silently killing otherwise-perfectly-good lesson generations. Walk the
 * text tracking whether we're inside a string literal and escape any raw
 * control character we find there, leaving structural whitespace (outside
 * strings) untouched.
 */
function escapeControlCharactersInStrings(text: string): string {
  let result = "";
  let inString = false;
  let escapeNext = false;

  for (const ch of text) {
    if (escapeNext) {
      result += ch;
      escapeNext = false;
      continue;
    }
    if (ch === "\\" && inString) {
      result += ch;
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString) {
      const code = ch.charCodeAt(0);
      if (code === 0x0a) {
        result += "\\n";
        continue;
      }
      if (code === 0x0d) {
        result += "\\r";
        continue;
      }
      if (code === 0x09) {
        result += "\\t";
        continue;
      }
      if (code < 0x20) {
        result += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
    }
    result += ch;
  }

  return result;
}

export function parseJsonUnknown(text: string): unknown {
  const jsonText = extractJsonText(text);
  try {
    return JSON.parse(jsonText) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError && /control character/i.test(error.message)) {
      return JSON.parse(escapeControlCharactersInStrings(jsonText)) as unknown;
    }
    throw error;
  }
}
