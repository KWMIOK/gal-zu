import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-20">
      <div className="space-y-4">
        <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
          Adaptive learning, powered by Gemini
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          What do you want to learn today?
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Gal-zu builds micro-lessons and full roadmaps tuned to your cognitive
          preferences — from a quick answer to multi-week mastery.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-medium text-white transition hover:bg-violet-500"
        >
          Open dashboard
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
