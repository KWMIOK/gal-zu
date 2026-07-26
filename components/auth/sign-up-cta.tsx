"use client";

import { SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useGalzuClerkAppearance } from "@/components/clerk/galzu-clerk-provider";
import { isNativePlatform } from "@/lib/capacitor/is-native";

type SignUpCtaProps = {
  children: ReactNode;
  className?: string;
  /**
   * Web-only: Clerk modal. Ignored on Capacitor — native always routes to
   * `/sign-up` so Google uses the OS account sheet (never Chrome).
   */
  webMode?: "modal" | "redirect";
  /** Fired when the CTA is activated (e.g. close a parent dialog). */
  onNavigate?: () => void;
};

/**
 * Permanent native-safe Sign Up entry.
 *
 * INVARIANT (see AGENTS.md): Capacitor must never mount Clerk
 * `<SignUpButton>` / `<SignIn>` Google OAuth — Android ejects that navigation
 * to Chrome. Native always `Link`s to `/sign-up` → `NativeAuthPanel` →
 * `startNativeGoogleAuth`.
 *
 * Do **not** reintroduce raw `<SignUpButton mode="modal">` in headers,
 * dialogs, or gates — use this component instead.
 */
export function SignUpCta({
  children,
  className,
  webMode = "modal",
  onNavigate,
}: SignUpCtaProps) {
  const { appearance } = useGalzuClerkAppearance();
  const [native, setNative] = useState<boolean | null>(null);

  useEffect(() => {
    setNative(isNativePlatform());
  }, []);

  // Avoid hydrating a Clerk modal that could flash Google OAuth on native.
  if (native === null) {
    return (
      <button type="button" className={className} disabled>
        {children}
      </button>
    );
  }

  if (native || webMode === "redirect") {
    return (
      <Link
        href="/sign-up"
        className={className}
        onClick={() => onNavigate?.()}
      >
        {children}
      </Link>
    );
  }

  return (
    <SignUpButton mode="modal" appearance={appearance}>
      <button type="button" className={className} onClick={() => onNavigate?.()}>
        {children}
      </button>
    </SignUpButton>
  );
}
