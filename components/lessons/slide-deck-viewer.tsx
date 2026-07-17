"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Shrink,
  StickyNote,
} from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
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
  const slide = slides[index];
  const progress = ((index + 1) / slides.length) * 100;
  const isLastSlide = index >= slides.length - 1;

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(slides.length - 1, i + 1));
  }, [slides.length]);

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
        if (isLastSlide) onFinish?.();
        else goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, isLastSlide, onFinish]);

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
    if (isLastSlide) {
      onFinish?.();
      return;
    }
    goNext();
  }

  const primaryLabel = isLastSlide ? "Finish lesson" : "Next";
  const primaryDisabled = isLastSlide && !onFinish;

  return (
    <div id="slide-deck-root" className="relative space-y-4">
      <div className="relative z-10 flex items-center justify-between gap-2 text-sm text-zinc-500">
        <span>
          Slide {index + 1} of {slides.length}
        </span>
        <div className="flex gap-2">
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
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {slide.title}
            </h2>
            <p className="text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
              {slide.body}
            </p>
            {slide.callout ? (
              <p className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-100">
                {slide.callout}
              </p>
            ) : null}
            {slide.visual_hint ? (
              <p className="text-sm italic text-zinc-500">{slide.visual_hint}</p>
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
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {primaryLabel} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
