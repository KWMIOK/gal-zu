"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { SignUpCta } from "@/components/auth/sign-up-cta";
import { useGalzuClerkAppearance } from "@/components/clerk/galzu-clerk-provider";
import { useT } from "@/components/preferences/learner-prefs-provider";
import { usePreferencesEdit } from "@/components/preferences/preferences-edit-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Always-visible app chrome. On the preferences page the Preferences link
 * becomes a Save control; leaving with unsaved edits confirms in-app.
 */
export function AppHeader() {
  const { appearance } = useGalzuClerkAppearance();
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const prefsEdit = usePreferencesEdit();
  const [navPending, startNav] = useTransition();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const onPreferencesPage =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  function go(href: string) {
    if (prefsEdit.dirty) {
      setPendingHref(href);
      setLeaveOpen(true);
      return;
    }
    startNav(() => {
      router.push(href);
    });
  }

  function confirmLeave() {
    const href = pendingHref ?? "/dashboard";
    setLeaveOpen(false);
    setPendingHref(null);
    startNav(() => {
      router.push(href);
    });
  }

  async function onSave() {
    if (!prefsEdit.dirty || prefsEdit.saving) return;
    await prefsEdit.save();
  }

  return (
    <>
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
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    prefsEdit.dirty && !prefsEdit.saving
                      ? "bg-violet-600 text-white hover:bg-violet-500"
                      : "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"
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

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={(open) => {
          setLeaveOpen(open);
          if (!open) setPendingHref(null);
        }}
        title={t("prefs.unsavedTitle")}
        description={t("prefs.unsavedLeave")}
        cancelLabel={t("prefs.stay")}
        confirmLabel={t("prefs.leave")}
        variant="neutral"
        onConfirm={confirmLeave}
      />
    </>
  );
}
