"use client";

import { useEffect } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";

import { useSpeechSynthesis } from "@/lib/tts/use-speech-synthesis";

/**
 * Mount with `key={slide.id}` from the parent so each slide gets a fresh
 * instance — that's what makes the "autoplay once per slide" mount effect
 * below safe instead of re-firing on unrelated re-renders.
 */
export function TtsControls({ text }: { text?: string }) {
  const { status, supported, play, pause, replay } = useSpeechSynthesis(text);

  useEffect(() => {
    if (supported && text) {
      play();
    }
    // Intentionally run once per mount (per slide) — see doc comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported || !text) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/70 px-2 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
      <Volume2 className="h-3.5 w-3.5 text-violet-500" />
      {status === "speaking" ? (
        <button
          type="button"
          onClick={pause}
          aria-label="Pause narration"
          className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Pause className="h-3.5 w-3.5" /> Pause
        </button>
      ) : (
        <button
          type="button"
          onClick={play}
          aria-label={status === "paused" ? "Resume narration" : "Play narration"}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Play className="h-3.5 w-3.5" /> {status === "paused" ? "Resume" : "Play"}
        </button>
      )}
      <button
        type="button"
        onClick={replay}
        aria-label="Replay narration"
        className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Replay
      </button>
    </div>
  );
}
