"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { SignUpButton } from "@clerk/nextjs";
import { Lock, Sparkles, X } from "lucide-react";

import { PLAN_TIERS } from "@/lib/billing/tiers";
import { PAID_DEPTH_LOCK_COPY } from "@/lib/billing/depth-access";
import { clerkAppearance } from "@/lib/clerk-appearance";

type PaidDepthGateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, primary CTA is Sign Up; otherwise emphasize Pro upgrade. */
  isAnonymous: boolean;
  depthLabel: string;
};

/**
 * Honest paywall for Deep Dive / Complete Mastery — never claims signup unlocks them.
 */
export function PaidDepthGateDialog({
  open,
  onOpenChange,
  isAnonymous,
  depthLabel,
}: PaidDepthGateDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-violet-100 p-2 dark:bg-violet-950/50">
              <Lock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {depthLabel} needs Pro
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {PAID_DEPTH_LOCK_COPY}
              </Dialog.Description>
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {PLAN_TIERS.pro.name} — {PLAN_TIERS.pro.priceLabel}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Includes Deep Dive, Complete Mastery, and{" "}
                  {PLAN_TIERS.pro.dailyLessonLimit} generations/day.
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700"
              >
                Keep exploring free
              </button>
            </Dialog.Close>
            {isAnonymous ? (
              <SignUpButton mode="modal" appearance={clerkAppearance}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                >
                  Sign Up
                </button>
              </SignUpButton>
            ) : (
              <button
                type="button"
                disabled
                title="Subscriptions aren't live yet — this button isn't wired to a purchase."
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-violet-600/40 px-4 py-2 text-sm font-semibold text-white opacity-70"
              >
                <Sparkles className="h-3.5 w-3.5" /> Upgrade (coming soon)
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
