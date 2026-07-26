"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { SignUpCta } from "@/components/auth/sign-up-cta";
import { useGalzuClerkAppearance } from "@/components/clerk/galzu-clerk-provider";
import { useT } from "@/components/preferences/learner-prefs-provider";

/**
 * Always-visible app chrome: Sign Up for anonymous learners, avatar +
 * preferences when registered. On Capacitor, Sign Up routes to `/sign-up`
 * (native Google OS sheet) — never Clerk's browser OAuth modal.
 */
export function AppHeader() {
  const { appearance } = useGalzuClerkAppearance();
  const t = useT();

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Gal-zu
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Show when="signed-out">
            <SignUpCta className="rounded-lg bg-violet-600 px-3 py-1.5 font-medium text-white hover:bg-violet-500">
              {t("nav.signUp")}
            </SignUpCta>
          </Show>
          <Show when="signed-in">
            <Link
              href="/onboarding"
              className="rounded-lg px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-violet-600 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              {t("nav.preferences")}
            </Link>
            <UserButton appearance={appearance} />
          </Show>
        </nav>
      </div>
    </header>
  );
}
