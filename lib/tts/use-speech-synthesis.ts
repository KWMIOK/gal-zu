"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "speaking" | "paused" | "unsupported";

const MUTE_STORAGE_KEY = "gal-zu:tts-muted";

/**
 * Scores a voice by how natural it's likely to sound. The Web Speech API
 * exposes every voice the OS/browser ships, which ranges from the ancient
 * robotic "eSpeak"/default engines to modern neural voices (Google's
 * online voices, Microsoft's "…Natural"/Neural voices, Apple's premium
 * "Samantha"/"Siri" voices). Left unselected, the browser picks its
 * lowest-common-denominator default — which is the robotic one. We pick the
 * highest-scoring available voice instead, biased toward English narration
 * (what lesson `spoken_narration` almost always is) but still returning
 * *something* if no English voice exists.
 */
function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  // Strongest signal: explicitly neural/natural/premium engines.
  if (/natural|neural|premium|enhanced|siri/.test(name)) score += 6;
  // Google's online voices are notably better than local defaults.
  if (name.includes("google")) score += 4;
  // Microsoft's modern voices (Aria, Jenny, Guy, Sonia, Libby…).
  if (name.includes("microsoft")) score += 3;
  // Well-known good-quality named voices across platforms.
  if (/samantha|aria|jenny|guy|sonia|libby|ava|allison|serena/.test(name)) {
    score += 3;
  }
  // Prefer English narration voices (lesson narration is ~always English).
  if (voice.lang?.toLowerCase().startsWith("en")) score += 2;
  // Slight nudge toward US English specifically.
  if (voice.lang?.toLowerCase() === "en-us") score += 1;
  if (voice.default) score += 1;

  return score;
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
}

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
  const [muted, setMutedState] = useState(false);
  // Mirror `muted` into a ref so `speak()` (a stable useCallback) always
  // reads the current value without needing to be recreated on every toggle.
  const mutedRef = useRef(false);
  const lastTextRef = useRef<string | undefined>(undefined);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Restore the persisted mute preference once on mount.
  useEffect(() => {
    if (!supported) return;
    try {
      if (window.localStorage.getItem(MUTE_STORAGE_KEY) === "1") {
        mutedRef.current = true;
        setMutedState(true);
      }
    } catch {
      /* localStorage can throw in private mode — ignore, default to unmuted */
    }
  }, [supported]);

  // Load the available voices and pick the best one. `getVoices()` is often
  // empty on first call and only populated after the async `voiceschanged`
  // event fires, so we listen for that too.
  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        preferredVoiceRef.current = pickBestVoice(voices);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [supported]);

  const speak = useCallback(
    (text: string | undefined) => {
      if (!supported) return;
      // Mute gates *all* narration — auto-play on slide change and manual
      // play alike — so a muted learner never gets surprised by audio.
      if (mutedRef.current) return;
      if (!text) {
        window.speechSynthesis.cancel();
        setStatus("idle");
        return;
      }

      window.speechSynthesis.cancel();
      lastTextRef.current = text;
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = preferredVoiceRef.current;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      // Neural/natural voices sound best near their natural cadence; a hair
      // below 1.0 reads slightly less rushed without sounding sluggish.
      utterance.rate = 0.97;
      utterance.pitch = 1;
      utterance.onend = () => setStatus("idle");
      utterance.onerror = () => setStatus("idle");
      window.speechSynthesis.speak(utterance);
      setStatus("speaking");
    },
    [supported],
  );

  const setMuted = useCallback(
    (value: boolean) => {
      mutedRef.current = value;
      setMutedState(value);
      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, value ? "1" : "0");
      } catch {
        /* ignore persistence failures */
      }
      // Muting should silence anything already playing immediately.
      if (value && supported) {
        window.speechSynthesis.cancel();
        setStatus("idle");
      }
    },
    [supported],
  );

  const toggleMute = useCallback(() => {
    setMuted(!mutedRef.current);
  }, [setMuted]);

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

  return {
    status,
    supported,
    muted,
    speak,
    pause,
    resume,
    replay,
    stop,
    toggleMute,
    setMuted,
  };
}
