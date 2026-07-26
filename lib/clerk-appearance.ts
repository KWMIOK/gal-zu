import { dark } from "@clerk/themes";
import type { ClerkAppearanceTheme } from "@clerk/shared/types";

/** Shown above Sign Up (AuthShell + Clerk localization / modal). */
export const SIGN_UP_SUBTITLE =
  "Create your account to personalise your experience as you learn";

/** Clerk v7: former `layout` prop is now `options`. */
const sharedOptions = {
  logoPlacement: "none" as const,
  socialButtonsPlacement: "top" as const,
  socialButtonsVariant: "blockButton" as const,
};

const sharedFonts = {
  borderRadius: "0.75rem",
  fontFamily: "var(--font-learner), ui-sans-serif, system-ui, sans-serif",
  fontFamilyButtons:
    "var(--font-learner), ui-sans-serif, system-ui, sans-serif",
  fontSize: "0.875rem",
};

type ElementStyle = string | Record<string, string | number>;

/**
 * Surface chrome is theme-explicit (driven by `isDark`, not Tailwind `dark:`).
 * Clerk emotion styles often beat utilities for background/radius/shadow —
 * which left the dark modal backdrop showing through rounded corners in light
 * mode, and a leftover card radius outline above the footer.
 *
 * Border/radius live on `cardBox` so `.cl-card` and `.cl-footer` share one
 * shell — Clerk renders the footer as a sibling of the card.
 */
function buildElements(isDark: boolean): Record<string, ElementStyle> {
  const shellBg = isDark ? "#18181b" : "#ffffff";
  const shellBorder = isDark ? "#27272a" : "#e4e4e7";
  const footerBg = isDark ? "#09090b" : "#fafafa";

  return {
    rootBox: "w-full",
    cardBox: {
      width: "100%",
      boxShadow: "none !important",
      borderRadius: "1rem !important",
      overflow: "hidden",
      backgroundColor: `${shellBg} !important`,
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: `${shellBorder} !important`,
    },
    card: {
      width: "100%",
      boxShadow: "none !important",
      borderRadius: "0 !important",
      borderWidth: "0 !important",
      backgroundColor: `${shellBg} !important`,
    },
    footer: {
      width: "100%",
      marginTop: "0 !important",
      borderRadius: "0 !important",
      boxShadow: "none !important",
      backgroundColor: `${footerBg} !important`,
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      borderTopColor: `${shellBorder} !important`,
      borderLeftWidth: "0",
      borderRightWidth: "0",
      borderBottomWidth: "0",
    },
    footerAction: "w-full",
    footerActionText: isDark ? "text-zinc-400" : "text-zinc-500",
    headerTitle: isDark
      ? "text-xl font-semibold tracking-tight text-zinc-50"
      : "text-xl font-semibold tracking-tight text-zinc-900",
    headerSubtitle: isDark ? "text-sm text-zinc-400" : "text-sm text-zinc-500",
    socialButtonsBlockButton: isDark
      ? "border border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900 rounded-lg"
      : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 rounded-lg",
    socialButtonsBlockButtonText: isDark
      ? "font-medium text-zinc-100"
      : "font-medium text-zinc-800",
    dividerLine: isDark ? "bg-zinc-700" : "bg-zinc-200",
    dividerText: isDark ? "text-zinc-500" : "text-zinc-400",
    formFieldLabel: isDark ? "text-zinc-300" : "text-zinc-700",
    formFieldInput: isDark
      ? "rounded-lg border-zinc-700 bg-zinc-950 text-zinc-50 focus:border-violet-500 focus:ring-violet-500"
      : "rounded-lg border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-violet-500 focus:ring-violet-500",
    formButtonPrimary:
      "rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-none",
    footerActionLink: isDark
      ? "text-violet-400 hover:text-violet-300 font-medium"
      : "text-violet-600 hover:text-violet-500 font-medium",
    identityPreviewEditButton: isDark
      ? "text-violet-400"
      : "text-violet-600",
    formFieldAction: isDark
      ? "text-violet-400 hover:text-violet-300"
      : "text-violet-600 hover:text-violet-500",
    alternativeMethodsBlockButton: isDark
      ? "border border-zinc-700 text-zinc-100 hover:bg-zinc-900 rounded-lg"
      : "border border-zinc-300 text-zinc-800 hover:bg-zinc-50 rounded-lg",
    otpCodeFieldInput: isDark
      ? "border-zinc-700 focus:border-violet-500"
      : "border-zinc-300 focus:border-violet-500",
    modalBackdrop: isDark
      ? "bg-black/70 backdrop-blur-sm"
      : "bg-zinc-950/40 backdrop-blur-sm",
    modalContent: {
      backgroundColor: "transparent !important",
      boxShadow: "none !important",
    },
    modalCloseButton: isDark
      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg"
      : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg",
  };
}

const lightVariables = {
  colorPrimary: "#7c3aed",
  colorPrimaryForeground: "#ffffff",
  colorDanger: "#dc2626",
  colorSuccess: "#16a34a",
  colorWarning: "#d97706",
  colorNeutral: "#71717a",
  colorForeground: "#18181b",
  colorMutedForeground: "#71717a",
  colorBackground: "#ffffff",
  colorMuted: "#fafafa",
  colorInput: "#fafafa",
  colorInputForeground: "#18181b",
  colorModalBackdrop: "#18181b",
  ...sharedFonts,
};

const darkVariables = {
  colorPrimary: "#8b5cf6",
  colorPrimaryForeground: "#ffffff",
  colorDanger: "#f87171",
  colorSuccess: "#4ade80",
  colorWarning: "#fbbf24",
  colorNeutral: "#a1a1aa",
  colorForeground: "#fafafa",
  colorMutedForeground: "#a1a1aa",
  colorBackground: "#18181b",
  colorMuted: "#27272a",
  colorInput: "#09090b",
  colorInputForeground: "#fafafa",
  colorModalBackdrop: "#000000",
  ...sharedFonts,
};

/**
 * Builds Clerk appearance for the current color scheme.
 * Clerk v7 Theme API: `theme` (was `baseTheme`) + `options` (was `layout`).
 */
export function buildClerkAppearance(isDark: boolean): ClerkAppearanceTheme {
  return {
    ...(isDark ? { theme: dark } : {}),
    options: sharedOptions,
    variables: isDark ? darkVariables : lightVariables,
    elements: buildElements(isDark),
  };
}

/** Default (SSR / light) appearance — prefer `buildClerkAppearance` at runtime. */
export const clerkAppearance = buildClerkAppearance(false);

export function buildClerkSignUpPageAppearance(
  isDark: boolean,
): ClerkAppearanceTheme {
  const base = buildClerkAppearance(isDark);
  return {
    ...base,
    elements: {
      ...((base.elements ?? {}) as Record<string, ElementStyle>),
      headerTitle: "hidden",
      headerSubtitle: "hidden",
    },
  };
}

export const clerkSignUpPageAppearance = buildClerkSignUpPageAppearance(false);

/** Clerk copy shared by modal Sign Up and the hosted component. */
export const clerkLocalization = {
  signUp: {
    start: {
      title: "Create your account",
      subtitle: SIGN_UP_SUBTITLE,
    },
  },
};
