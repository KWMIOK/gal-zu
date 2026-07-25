"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Gemini often emits slide `text_content` as a single run-on line that mixes
 * markdown emphasis (`**term**`, `*translit*`) with literal `•` bullet
 * characters instead of newline-separated markdown list items. Rendered
 * verbatim in a `<p>`, that reads as an unbroken wall of text. This
 * normalizes the common shapes into real markdown before rendering:
 *
 *  - Splits inline `•`-delimited runs into a proper `-` markdown list
 *    (keeping any lead-in sentence before the first bullet as its own line).
 *  - Normalizes CRLF and collapses excess blank lines.
 *
 * It intentionally does nothing clever for text that's already well-formed
 * markdown (no `•`), so pre-existing clean lessons render unchanged.
 */
function normalizeToMarkdown(raw: string): string {
  const text = raw.replace(/\r\n/g, "\n").trim();

  if (text.includes("•")) {
    const firstBullet = text.indexOf("•");
    const intro = text.slice(0, firstBullet).trim();
    const items = text
      .slice(firstBullet + 1)
      .split("•")
      .map((segment) => segment.trim())
      .filter(Boolean);

    const list = items.map((item) => `- ${item}`).join("\n");
    return intro ? `${intro}\n\n${list}` : list;
  }

  return text;
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p dir="auto" className="my-2 leading-8 text-zinc-700 dark:text-zinc-200">
      {children}
    </p>
  ),
  // Bold is used for the key term being defined — color it so it stands out
  // from the surrounding explanation.
  strong: ({ children }) => (
    <strong className="font-semibold text-violet-700 dark:text-violet-300">
      {children}
    </strong>
  ),
  // Italics are typically transliterations / secondary readings.
  em: ({ children }) => (
    <em className="italic text-zinc-500 dark:text-zinc-400">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-2 pl-6 marker:text-violet-500">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-2 pl-6 marker:text-violet-500">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li dir="auto" className="leading-8 text-zinc-700 dark:text-zinc-200">
      {children}
    </li>
  ),
  code: ({ children }) => (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-violet-700 dark:bg-zinc-800 dark:text-violet-300">
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-violet-600 underline hover:no-underline dark:text-violet-400"
    >
      {children}
    </a>
  ),
};

/**
 * Renders slide body text as styled markdown (colored key terms, italic
 * transliterations, proper bullet lists) with `dir="auto"` so mixed
 * Arabic/Latin script lays out correctly.
 */
export function SlideRichText({ text }: { text: string }) {
  return (
    <div className="text-lg">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalizeToMarkdown(text)}
      </ReactMarkdown>
    </div>
  );
}
