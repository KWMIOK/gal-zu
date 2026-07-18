"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Shrink,
  StickyNote,
} from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { InteractiveWidgetPlayer } from "@/components/lessons/interactive-widget";
import { LottieSlideAnimation } from "@/components/lessons/lottie-slide-animation";
import { TtsControls } from "@/components/lessons/tts-controls";
import { useSpeechSynthesis } from "@/lib/tts/use-speech-synthesis";
import type { SlideContent } from "@/types/database";

export function SlideDeckViewer({
  content,
  onFinish,
}: {
  content: SlideContent;
  onFinish?: () => void;
}) {
  const slides = content.slides;
  const [index, setIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [solvedWidgets, setSolvedWidgets] = useState<Set<string>>(new Set());
  const tts = useSpeechSynthesis();
  const slide = slides[index];
  const progress = ((index + 1) / slides.length) * 100;
  const isLastSlide = index >= slides.length - 1;
  const slideText = slide.text_content ?? slide.body ?? "";
  const widgetLocked = Boolean(
    slide.interactive_widget && !solvedWidgets.has(slide.id),
  );

  const markWidgetSolved = useCallback((slideId: string) => {
    setSolvedWidgets((prev) => new Set(prev).add(slideId));
  }, []);

  // Narration is triggered synchronously here — inside the same click /
  // keydown call stack that changes the slide — because
  // `speechSynthesis.speak()` only reliably plays audio when invoked
  // inside a genuine user-gesture call stack. Firing it from a `useEffect`
  // after the slide re-renders is *not* a gesture context in most
  // browsers/WebViews and gets silently swallowed (no error, no sound).
  const goPrev = useCallback(() => {
    const target = Math.max(0, index - 1);
    setIndex(target);
    tts.speak(slides[target]?.spoken_narration);
  }, [index, slides, tts]);

  const goNext = useCallback(() => {
    const target = Math.min(slides.length - 1, index + 1);
    setIndex(target);
    tts.speak(slides[target]?.spoken_narration);
  }, [index, slides, tts]);

  useEffect(() => {
    // Best-effort only: the very first slide has no preceding user gesture
    // on initial page load, so browsers may block this silently — that's
    // an inherent platform limitation, not a bug. The Play button always
    // works since it's a real click.
    tts.speak(slides[0]?.spoken_narration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") {
        if (widgetLocked) return;
        if (isLastSlide) onFinish?.();
        else goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, isLastSlide, onFinish, widgetLocked]);

  async function toggleFullscreen() {
    const el = document.getElementById("slide-deck-root");
    if (!document.fullscreenElement && el) {
      await el.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  }

  useEffect(() => {
    function onFsChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function handlePrimaryAction() {
    if (widgetLocked) return;
    if (isLastSlide) {
      tts.stop();
      onFinish?.();
      return;
    }
    goNext();
  }

  const primaryLabel = isLastSlide ? "Finish lesson" : "Next";
  const primaryDisabled = (isLastSlide && !onFinish) || widgetLocked;

  return (
    <div id="slide-deck-root" className="relative space-y-4">
      <div className="relative z-10 flex items-center justify-between gap-2 text-sm text-zinc-500">
        <span>
          Slide {index + 1} of {slides.length}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <TtsControls
            status={tts.status}
            supported={tts.supported}
            hasText={Boolean(slide.spoken_narration)}
            onPlay={() => {
              if (tts.status === "paused") tts.resume();
              else tts.speak(slide.spoken_narration);
            }}
            onPause={tts.pause}
            onReplay={tts.replay}
          />
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <StickyNote className="h-4 w-4" />
            Notes
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {fullscreen ? (
              <Shrink className="h-4 w-4" />
            ) : (
              <Expand className="h-4 w-4" />
            )}
            Fullscreen
          </button>
        </div>
      </div>

      <div className="relative z-10 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <GlassCard className="relative z-0 min-h-[320px] overflow-hidden p-6 md:min-h-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <LottieSlideAnimation animationPrompt={slide.animation_prompt} />

            <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-left">
              {slide.title}
            </h2>
            <p className="text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
              {slideText}
            </p>
            {slide.callout ? (
              <p className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-100">
                {slide.callout}
              </p>
            ) : null}
            {slide.visual_hint ? (
              <p className="text-sm italic text-zinc-500">{slide.visual_hint}</p>
            ) : null}

            {slide.interactive_widget ? (
              <InteractiveWidgetPlayer
                widget={slide.interactive_widget}
                onComplete={() => markWidgetSolved(slide.id)}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </GlassCard>

      {showNotes && slide.speaker_notes ? (
        <GlassCard className="relative z-10 p-4 text-sm text-zinc-600 dark:text-zinc-400">
          <p className="font-medium text-zinc-900 dark:text-zinc-200">
            Speaker notes
          </p>
          <p className="mt-1">{slide.speaker_notes}</p>
        </GlassCard>
      ) : null}

      {showNotes && !slide.speaker_notes ? (
        <p className="relative z-10 text-sm text-zinc-500">
          No speaker notes for this slide.
        </p>
      ) : null}

      <CitationsFooter citations={content.citations} />

      <div className="relative z-10 flex justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={primaryDisabled}
          title={widgetLocked ? "Complete the activity above to continue" : undefined}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {primaryLabel} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CitationsFooter({
  citations,
}: {
  citations?: { title: string; url: string }[];
}) {
  const items = useMemo(() => citations ?? [], [citations]);
  if (items.length === 0) return null;

  return (
    <div className="relative z-10 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
      <p className="mb-1 font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        Grounded with Google Search — sources
      </p>
      <ul className="space-y-0.5">
        {items.map((c, i) => (
          <li key={`${c.url}-${i}`} className="truncate">
            <a
              href={c.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-violet-600 hover:underline dark:text-violet-400"
            >
              {c.title || c.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
