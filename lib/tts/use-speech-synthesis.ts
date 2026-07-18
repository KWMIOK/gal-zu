"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "speaking" | "paused" | "unsupported";

/**
 * Thin wrapper around the Web Speech API (`window.speechSynthesis`).
 * One hook instance is meant to live for exactly one piece of narration —
 * mount it with a `key` tied to that content (e.g. the slide id) so it
 * resets cleanly instead of trying to resume a stale utterance.
 */
export function useSpeechSynthesis(text: string | undefined) {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [status, setStatus] = useState<SpeechStatus>(
    supported ? "idle" : "unsupported",
  );
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const play = useCallback(() => {
    if (!supported || !text) return;

    if (status === "paused" && utteranceRef.current) {
      window.speechSynthesis.resume();
      setStatus("speaking");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setStatus("speaking");
  }, [supported, text, status]);

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, [supported]);

  const replay = useCallback(() => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
    // Re-queue on next tick so `cancel()` has flushed before `speak()`.
    setTimeout(() => play(), 0);
  }, [supported, text, play]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { status, supported, play, pause, replay };
}
