export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
        </div>
      </div>
    </div>
  );
}
