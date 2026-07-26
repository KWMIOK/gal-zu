import { dark } from "@clerk/themes";
import type { ClerkAppearanceTheme } from "@clerk/shared/types";

/** Shown above Sign Up (AuthShell + Clerk localization / modal). */
export const SIGN_UP_SUBTITLE =
  "Create your account to personalise your experience as you learn";

const sharedLayout = {
  logoPlacement: "none" as const,
  socialButtonsPlacement: "top" as const,
  socialButtonsVariant: "blockButton" as const,
};

const sharedFonts = {
  borderRadius: "0.75rem",
  fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  fontFamilyButtons:
    "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  fontSize: "0.875rem",
};

/**
 * Shared structural classes — Tailwind `dark:` follows system preference
 * (Tailwind v4 media strategy) so elements stay correct even before JS runs.
 *
 * Border/radius live on `cardBox` (not `card`) so `.cl-card` and `.cl-footer`
 * share one aligned shell — Clerk renders the footer as a sibling of the card.
 */
const sharedElements = {
  rootBox: "w-full",
  cardBox:
    "w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
  card: "w-full rounded-none border-0 bg-transparent shadow-none",
  footer:
    "w-full !m-0 rounded-none border-x-0 border-b-0 border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60",
  footerAction: "w-full",
  footerActionText: "text-zinc-500 dark:text-zinc-400",
  headerTitle:
    "text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50",
  headerSubtitle: "text-sm text-zinc-500 dark:text-zinc-400",
  socialButtonsBlockButton:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 rounded-lg dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900",
  socialButtonsBlockButtonText:
    "font-medium text-zinc-800 dark:text-zinc-100",
  dividerLine: "bg-zinc-200 dark:bg-zinc-700",
  dividerText: "text-zinc-400 dark:text-zinc-500",
  formFieldLabel: "text-zinc-700 dark:text-zinc-300",
  formFieldInput:
    "rounded-lg border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-violet-500 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50",
  formButtonPrimary:
    "rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-none",
  footerActionLink:
    "text-violet-600 hover:text-violet-500 font-medium dark:text-violet-400",
  identityPreviewEditButton: "text-violet-600 dark:text-violet-400",
  formFieldAction: "text-violet-600 hover:text-violet-500 dark:text-violet-400",
  alternativeMethodsBlockButton:
    "border border-zinc-300 text-zinc-800 hover:bg-zinc-50 rounded-lg dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900",
  otpCodeFieldInput:
    "border-zinc-300 focus:border-violet-500 dark:border-zinc-700",
  modalBackdrop: "bg-zinc-950/50 backdrop-blur-sm dark:bg-black/70",
  modalContent: "bg-transparent",
  modalCloseButton:
    "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800",
};

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
 * Builds Clerk appearance for the current color scheme. When `isDark`, layers
 * `@clerk/themes` `dark` so modal surfaces aren't stuck on white.
 */
export function buildClerkAppearance(isDark: boolean): ClerkAppearanceTheme {
  return {
    ...(isDark ? { baseTheme: dark } : {}),
    layout: sharedLayout,
    variables: isDark ? darkVariables : lightVariables,
    elements: sharedElements,
  } as ClerkAppearanceTheme;
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
      ...(base as { elements?: Record<string, string> }).elements,
      headerTitle: "hidden",
      headerSubtitle: "hidden",
    },
  } as ClerkAppearanceTheme;
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
