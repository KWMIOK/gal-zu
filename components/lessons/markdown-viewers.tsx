"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

import { GlassCard } from "@/components/ui/glass-card";
import type { CheatSheetContent, ScriptContent } from "@/types/database";

import "katex/dist/katex.min.css";

function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-zinc max-w-none dark:prose-invert prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export function CheatSheetViewer({ content }: { content: CheatSheetContent }) {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6 md:p-8">
        <MarkdownBody markdown={content.markdown} />
      </GlassCard>

      <div className="flex flex-wrap gap-2">
        {content.key_takeaways.map((item) => (
          <span
            key={item}
            className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-medium text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-100"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ScriptViewer({ content }: { content: ScriptContent }) {
  return (
    <GlassCard className="p-6 md:p-8">
      <MarkdownBody markdown={content.markdown} />
    </GlassCard>
  );
}
