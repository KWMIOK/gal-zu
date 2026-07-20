"use client";

/**
 * Catches errors thrown in the root layout itself (rare — most render
 * errors are caught by app/error.tsx first). Must define its own <html>
 * and <body> since it replaces the root layout when active.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center text-zinc-900">
        <p className="text-lg font-semibold">Gal-zu hit an unexpected error.</p>
        {error.digest ? (
          <p className="rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-500">
            Reference: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
