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

export function parseJsonUnknown(text: string): unknown {
  const jsonText = extractJsonText(text);
  return JSON.parse(jsonText) as unknown;
}
