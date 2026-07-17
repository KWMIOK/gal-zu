import type { ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/40 bg-white/60 shadow-lg shadow-violet-500/5 backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/60 ${className}`}
    >
      {children}
    </div>
  );
}
