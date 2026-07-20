"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";

/**
 * Route-level error boundary — without this, any uncaught throw in a
 * Server Component render (e.g. a DB call failing, a bug in a page) fell
 * through to Next's bare-bones default crash screen, which in production
 * only shows "An error occurred in the Server Components render..." with
 * no way to retry or even see the digest. This at least gives the learner
 * a way back and gives us a digest to correlate against server logs.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 py-16">
      <GlassCard className="w-full space-y-4 p-6">
        <p className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" /> Something went wrong.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {process.env.NODE_ENV === "development"
            ? error.message
            : "The specific error message is hidden in production. If this keeps happening, share the reference below."}
        </p>
        {error.digest ? (
          <p className="rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
