"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, HelpCircle, Loader2, XCircle } from "lucide-react";

import {
  fetchQuizHintAction,
  recordQuizOutcomeAction,
} from "@/app/actions/lessons";
import { GlassCard } from "@/components/ui/glass-card";
import type { QuizContent } from "@/types/database";
import type { FinishedCta } from "@/components/lessons/slide-deck-viewer";

export function QuizViewer({
  content,
  onComplete,
  finishedCta,
}: {
  content: QuizContent;
  onComplete?: () => void;
  finishedCta?: FinishedCta;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [aiHintError, setAiHintError] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [hintPending, startHintTransition] = useTransition();

  const question = content.questions[index];
  const passing = content.passing_score_percent ?? 70;

  function submitChoice(choiceIndex: number) {
    if (feedback) return;
    setSelected(choiceIndex);
    const correct = choiceIndex === question.correct_index;
    setFeedback(correct ? "correct" : "wrong");
    if (correct) setCorrectCount((s) => s + 1);

    // Free path only: show the hint that shipped with the quiz payload.
    // Never auto-call Gemini on a wrong answer — that requires an explicit
    // opt-in click below (AGENTS.md user-spend consent rules).
    setHint(question.hint ?? null);
    setAiHintError(null);
  }

  function requestAiHint() {
    if (selected === null || hintPending) return;
    setAiHintError(null);
    startHintTransition(async () => {
      try {
        const dynamicHint = await fetchQuizHintAction(
          question.prompt,
          question.choices[selected],
        );
        setHint(dynamicHint);
      } catch (error) {
        setAiHintError(
          error instanceof Error ? error.message : "Could not fetch an AI hint.",
        );
      }
    });
  }

  function nextQuestion() {
    if (index + 1 >= content.questions.length) {
      setDone(true);
      const pct = Math.round((correctCount / content.questions.length) * 100);
      // Free adaptation signal — no Gemini spend.
      void recordQuizOutcomeAction(pct, content.questions.length);
      if (pct >= passing) onComplete?.();
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setFeedback(null);
    setHint(null);
    setAiHintError(null);
  }

  if (done) {
    const pct = Math.round((correctCount / content.questions.length) * 100);
    const passed = pct >= passing;
    return (
      <GlassCard className="space-y-3 p-8 text-center">
        {passed ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-amber-500" />
        )}
        <h3 className="text-xl font-semibold">
          {passed ? "Great work!" : "Keep practicing"}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">
          Score: {correctCount}/{content.questions.length} ({pct}%)
        </p>
        {passed && finishedCta ? (
          <Link
            href={finishedCta.href}
            className="mt-2 inline-flex items-center gap-1 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            {finishedCta.label} <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
        {!passed ? (
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setSelected(null);
              setFeedback(null);
              setHint(null);
              setAiHintError(null);
              setCorrectCount(0);
              setDone(false);
            }}
            className="mt-2 inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900/50"
          >
            Retake quiz
          </button>
        ) : null}
      </GlassCard>
    );
  }

  const showAiHintButton =
    feedback === "wrong" && selected !== null && !hintPending;

  return (
    <GlassCard className="space-y-5 p-6">
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>
          Question {index + 1} of {content.questions.length}
        </span>
        <span>
          Score: {correctCount}/{content.questions.length}
        </span>
      </div>

      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        {question.prompt}
      </p>

      <div className="space-y-2">
        {question.choices.map((choice, i) => {
          const isSelected = selected === i;
          const isCorrect = i === question.correct_index;
          let ring = "border-zinc-200 dark:border-zinc-700";
          if (feedback && isSelected && isCorrect) ring = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
          if (feedback && isSelected && !isCorrect) ring = "border-red-400 bg-red-50 dark:bg-red-950/30";
          if (feedback && !isSelected && isCorrect) ring = "border-emerald-400/60";

          return (
            <button
              key={choice}
              type="button"
              disabled={Boolean(feedback)}
              onClick={() => submitChoice(i)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${ring}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {hint ? (
        <p className="flex items-start gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {hint}
        </p>
      ) : null}

      {showAiHintButton ? (
        <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <button
            type="button"
            onClick={requestAiHint}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-amber-900 hover:underline dark:text-amber-100"
          >
            <HelpCircle className="h-4 w-4" />
            Get an AI hint
          </button>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
            Uses AI quota — only runs if you click. Wrong answers do not spend
            automatically.
          </p>
        </div>
      ) : null}

      {hintPending ? (
        <p className="inline-flex items-center gap-2 text-sm text-violet-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching an AI hint…
        </p>
      ) : null}

      {aiHintError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{aiHintError}</p>
      ) : null}

      {feedback && question.explanation ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {question.explanation}
        </p>
      ) : null}

      {feedback ? (
        <button
          type="button"
          onClick={nextQuestion}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {index + 1 >= content.questions.length ? "See results" : "Next question"}
        </button>
      ) : null}
    </GlassCard>
  );
}
