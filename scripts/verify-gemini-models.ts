/**
 * Smoke-tests every model in `lib/gemini.ts`'s `MODEL_CANDIDATES` list
 * directly against the Gemini API. Run this whenever lesson content looks
 * suspiciously generic — Gemini model IDs get deprecated/renamed
 * regularly, and `generateLessonPayload` fails *silently* into placeholder
 * fallback content when every candidate is unreachable (by design, so a
 * flaky API never breaks the whole app — but that also means a fully dead
 * model list is easy to miss without a check like this one).
 *
 * Deliberately does not import `lib/gemini.ts` (it's `server-only`, which
 * throws outside of Next's bundler) — the candidate list below must be
 * kept in sync with `MODEL_CANDIDATES` by hand.
 */
import { GoogleGenAI } from "@google/genai";

const MODEL_CANDIDATES = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
];

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(
      "GEMINI_API_KEY is not set. Copy .env.local.example to .env.local and fill it in.",
    );
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  let anyWorking = false;

  for (const model of MODEL_CANDIDATES) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: "Reply with just: OK" }] }],
        config: { maxOutputTokens: 20 },
      });
      console.log(`✔ ${model} — reachable (replied: "${res.text?.trim() ?? "<empty>"}")`);
      anyWorking = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`✘ ${model} — ${message.slice(0, 220)}`);
    }
  }

  if (!anyWorking) {
    console.error(
      "\nNone of the configured Gemini models are reachable with this API key.\n" +
        "Lesson generation will silently produce generic placeholder content until this is fixed.\n" +
        "Update MODEL_CANDIDATES in lib/gemini.ts (and this file) against the current list at\n" +
        "https://ai.google.dev/gemini-api/docs/models",
    );
    process.exit(1);
  }

  console.log("\nAt least one configured model is reachable — Gemini generation should work.");
}

main();
