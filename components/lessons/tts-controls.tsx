"use client";

import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

import type { SpeechStatus } from "@/lib/tts/use-speech-synthesis";

/**
 * Purely presentational — the parent (`SlideDeckViewer`) owns the single
 * `useSpeechSynthesis` instance and drives narration synchronously from
 * its click/keydown handlers so `speechSynthesis.speak()` fires inside a
 * real user-gesture call stack (required for audio to actually play in
 * most browsers/WebViews).
 */
export function TtsControls({
  status,
  supported,
  hasText,
  muted,
  onPlay,
  onPause,
  onReplay,
  onToggleMute,
}: {
  status: SpeechStatus;
  supported: boolean;
  hasText: boolean;
  muted: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onToggleMute: () => void;
}) {
  if (!supported || !hasText) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/70 px-2 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? "Unmute narration" : "Mute narration"}
        aria-pressed={muted}
        title={muted ? "Unmute narration" : "Mute narration"}
        className="inline-flex cursor-pointer items-center rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {muted ? (
          <VolumeX className="h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <Volume2 className="h-3.5 w-3.5 text-violet-500" />
        )}
      </button>
      {muted ? (
        <span className="px-1 text-zinc-400">Muted</span>
      ) : (
        <>
          {status === "speaking" ? (
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause narration"
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={onPlay}
              aria-label={
                status === "paused" ? "Resume narration" : "Play narration"
              }
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Play className="h-3.5 w-3.5" />{" "}
              {status === "paused" ? "Resume" : "Play"}
            </button>
          )}
          <button
            type="button"
            onClick={onReplay}
            aria-label="Replay narration"
            className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Replay
          </button>
        </>
      )}
    </div>
  );
}
