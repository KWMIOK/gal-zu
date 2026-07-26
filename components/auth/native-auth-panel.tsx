"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { startNativeGoogleAuth } from "@/lib/capacitor/native-oauth";

type Mode = "sign-in" | "sign-up";

type NativeAuthPanelProps = {
  mode: Mode;
};

/**
 * Capacitor-only sign-in / sign-up. Google uses the OS account picker
 * (Credential Manager bottom sheet on Android / iOS Google Sign-In) and
 * exchanges the ID token with Clerk — no browser.
 */
export function NativeAuthPanel({ mode }: NativeAuthPanelProps) {
  const router = useRouter();
  const { setActive } = useClerk();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = signInLoaded && signUpLoaded && !!signIn && !!signUp && !!setActive;
  const isSignIn = mode === "sign-in";

  async function onGoogle() {
    if (!signIn || !signUp || !setActive) return;
    setBusy(true);
    setError(null);
    try {
      const { createdSessionId } = await startNativeGoogleAuth({
        signIn,
        signUp,
        setActive,
      });
      if (!createdSessionId) return;
      router.replace(isSignIn ? "/dashboard" : "/onboarding");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google sign-in failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-5 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {isSignIn ? "Sign in" : "Create your account"}
        </h1>
      </div>

      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void onGoogle()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        <GoogleMark />
        {busy ? "Waiting for Google…" : "Continue with Google"}
      </button>

      {error ? (
        <p className="text-center text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        {isSignIn ? (
          <>
            New here?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Create account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
