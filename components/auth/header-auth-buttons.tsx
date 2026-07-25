"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { isNativePlatform } from "@/lib/capacitor/is-native";

/**
 * Header auth CTAs. On Capacitor, link to `/sign-in` / `/sign-up` so the
 * native OAuth panel owns Google (modal `<SignInButton>` would navigate the
 * WebView and eject to Chrome). On web, keep the existing modal buttons.
 */
export function HeaderAuthButtons() {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativePlatform());
  }, []);

  return (
    <Show when="signed-out">
      {native ? (
        <>
          <Link
            href="/sign-in"
            className="rounded-lg px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-violet-600 px-3 py-1.5 font-medium text-white hover:bg-violet-500"
          >
            Get started
          </Link>
        </>
      ) : (
        <>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-lg bg-violet-600 px-3 py-1.5 font-medium text-white hover:bg-violet-500"
            >
              Get started
            </button>
          </SignUpButton>
        </>
      )}
    </Show>
  );
}
