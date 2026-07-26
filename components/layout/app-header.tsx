"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import { SignUpCta } from "@/components/auth/sign-up-cta";
import { useGalzuClerkAppearance } from "@/components/clerk/galzu-clerk-provider";
import { useT } from "@/components/preferences/learner-prefs-provider";
import { usePreferencesEdit } from "@/components/preferences/preferences-edit-context";

/**
 * Always-visible app chrome. On the preferences page the Preferences link
 * becomes a prominent Save control; leaving with unsaved edits confirms first.
 */
export function AppHeader() {
  const { appearance } = useGalzuClerkAppearance();
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const prefsEdit = usePreferencesEdit();
  const [navPending, startNav] = useTransition();

  const onPreferencesPage =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  function confirmLeaveIfDirty(): boolean {
    if (!prefsEdit.dirty) return true;
    return window.confirm(t("prefs.unsavedLeave"));
  }

  function go(href: string) {
    if (!confirmLeaveIfDirty()) return;
    startNav(() => {
      router.push(href);
    });
  }

  async function onSave() {
    await prefsEdit.save();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <button
          type="button"
          onClick={() => go("/dashboard")}
          className="text-sm font-semibold tracking-tight"
        >
          Gal-zu
        </button>
        <nav className="flex items-center gap-3 text-sm">
          <Show when="signed-out">
            <SignUpCta className="rounded-lg bg-violet-600 px-3 py-1.5 font-medium text-white hover:bg-violet-500">
              {t("nav.signUp")}
            </SignUpCta>
          </Show>
          <Show when="signed-in">
            {onPreferencesPage && prefsEdit.active ? (
              <button
                type="button"
                disabled={prefsEdit.saving || !prefsEdit.dirty}
                onClick={() => void onSave()}
                className={`rounded-lg px-3 py-1.5 font-semibold transition disabled:opacity-50 ${
                  prefsEdit.dirty
                    ? "bg-violet-600 text-white hover:bg-violet-500"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                {prefsEdit.saving ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("prefs.saving")}
                  </span>
                ) : (
                  t("prefs.save")
                )}
              </button>
            ) : (
              <Link
                href="/onboarding"
                prefetch
                className="rounded-lg px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-violet-600 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                {t("nav.preferences")}
              </Link>
            )}
            <UserButton appearance={appearance} />
          </Show>
          {navPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : null}
        </nav>
      </div>
    </header>
  );
}
