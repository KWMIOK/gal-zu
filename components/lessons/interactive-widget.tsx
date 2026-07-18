"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import type { InteractiveWidget } from "@/types/database";

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Renders `interactive_widget` payloads and halts slide progression (via
 * `onComplete`) until the learner finishes the mini-game. `match_pairs` is
 * the only implemented type today — the `switch` makes adding more
 * (`fill_blank`, `order_steps`, ...) a matter of one more case.
 */
export function InteractiveWidgetPlayer({
  widget,
  onComplete,
}: {
  widget: InteractiveWidget;
  onComplete: () => void;
}) {
  switch (widget.type) {
    case "match_pairs":
      return <MatchPairsGame widget={widget} onComplete={onComplete} />;
    default:
      return null;
  }
}

function MatchPairsGame({
  widget,
  onComplete,
}: {
  widget: InteractiveWidget;
  onComplete: () => void;
}) {
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const rightOrder = useMemo(() => shuffled(widget.data), [widget.data]);
  const isComplete = matched.size === widget.data.length;

  function pickLeft(id: string) {
    if (matched.has(id)) return;
    setSelectedLeft(id);
  }

  function pickRight(id: string) {
    if (!selectedLeft || matched.has(id)) return;

    if (selectedLeft === id) {
      const next = new Set(matched);
      next.add(id);
      setMatched(next);
      setSelectedLeft(null);
      if (next.size === widget.data.length) {
        onComplete();
      }
    } else {
      setWrongId(id);
      setSelectedLeft(null);
      setTimeout(() => setWrongId(null), 400);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
      <p className="text-sm font-medium text-violet-900 dark:text-violet-200">
        {widget.prompt ?? "Match each pair to unlock the next slide:"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {widget.data.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={matched.has(item.id)}
              onClick={() => pickLeft(item.id)}
              className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-default ${
                matched.has(item.id)
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : selectedLeft === item.id
                    ? "border-violet-500 bg-violet-100 dark:bg-violet-900/40"
                    : "border-zinc-200 bg-white hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900"
              }`}
            >
              {item.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rightOrder.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={matched.has(item.id)}
              onClick={() => pickRight(item.id)}
              className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-default ${
                matched.has(item.id)
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : wrongId === item.id
                    ? "border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
                    : "border-zinc-200 bg-white hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900"
              }`}
            >
              {item.right}
            </button>
          ))}
        </div>
      </div>
      {isComplete ? (
        <p className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> All matched — you can continue.
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Matched {matched.size} of {widget.data.length}.
        </p>
      )}
    </div>
  );
}
