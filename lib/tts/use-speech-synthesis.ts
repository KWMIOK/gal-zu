"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "speaking" | "paused" | "unsupported";

/**
 * Thin wrapper around the Web Speech API (`window.speechSynthesis`).
 *
 * Deliberately exposes `speak(text)` as an imperative call rather than
 * auto-playing from a `useEffect` on mount. Browsers only allow
 * `speechSynthesis.speak()` to reliably produce audio when it's invoked
 * synchronously inside a real user-gesture call stack (click, keydown) —
 * an effect that fires after a render commit is *not* that, so a
 * mount-triggered auto-play gets silently swallowed on many
 * browsers/WebViews (no error, no audio). Call `speak()` directly from
 * the click/keydown handler that changes slides instead.
 */
export function useSpeechSynthesis() {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [status, setStatus] = useState<SpeechStatus>(
    supported ? "idle" : "unsupported",
  );
  const lastTextRef = useRef<string | undefined>(undefined);

  const speak = useCallback(
    (text: string | undefined) => {
      if (!supported) return;
      if (!text) {
        window.speechSynthesis.cancel();
        setStatus("idle");
        return;
      }

      window.speechSynthesis.cancel();
      lastTextRef.current = text;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setStatus("idle");
      utterance.onerror = () => setStatus("idle");
      window.speechSynthesis.speak(utterance);
      setStatus("speaking");
    },
    [supported],
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setStatus("speaking");
  }, [supported]);

  const replay = useCallback(() => {
    if (lastTextRef.current) speak(lastTextRef.current);
  }, [speak]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setStatus("idle");
  }, [supported]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { status, supported, speak, pause, resume, replay, stop };
}
