import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  /** Short line under the brand — keep to one sentence. */
  subtitle?: string;
};

/**
 * Shared chrome for sign-in / sign-up: brand-first, no extra CTAs.
 * Clerk or the native Google panel renders inside as the only action.
 */
export function AuthShell({
  children,
  subtitle = "Sign in to continue learning.",
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(24,24,27,0.04),_transparent_50%)]"
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        <div className="space-y-2 text-center">
          <p className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Gal-zu
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </main>
  );
}
