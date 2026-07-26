export default function OnboardingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="mx-auto h-8 w-64 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
      <div className="h-4 w-full animate-pulse rounded bg-zinc-200/60 dark:bg-zinc-800/60" />
      <div className="space-y-3 rounded-2xl border border-zinc-200/80 p-6 dark:border-zinc-800">
        <div className="h-11 animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-11 animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-11 animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-11 animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />
      </div>
    </div>
  );
}
