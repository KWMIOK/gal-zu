"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerSnapshot() {
  // SSR default; client hydrates to the real system preference immediately.
  return false;
}

/** Tracks `prefers-color-scheme: dark` for theme-aware Clerk chrome. */
export function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
