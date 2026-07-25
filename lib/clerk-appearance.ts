import type { ClerkAppearanceTheme } from "@clerk/shared/types";

/**
 * Clerk UI tokens aligned with Gal-zu's zinc + violet surfaces
 * (`app/layout.tsx`, dashboard buttons, auth shell).
 *
 * Cast: `@clerk/shared`'s Theme type lags the runtime `layout` field that
 * `@clerk/react` documents (`logoPlacement`, social button placement).
 */
export const clerkAppearance = {
  layout: {
    // AuthShell already shows the Gal-zu brand above the form.
    logoPlacement: "none",
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
  },
  variables: {
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
    borderRadius: "0.75rem",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons:
      "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    fontSize: "0.875rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border border-zinc-200 bg-white shadow-sm rounded-2xl",
    headerTitle: "text-xl font-semibold tracking-tight text-zinc-900",
    headerSubtitle: "text-sm text-zinc-500",
    socialButtonsBlockButton:
      "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 rounded-lg",
    socialButtonsBlockButtonText: "font-medium text-zinc-800",
    dividerLine: "bg-zinc-200",
    dividerText: "text-zinc-400",
    formFieldLabel: "text-zinc-700",
    formFieldInput:
      "rounded-lg border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-violet-500 focus:ring-violet-500",
    formButtonPrimary:
      "rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-none",
    footerActionLink: "text-violet-600 hover:text-violet-500 font-medium",
    identityPreviewEditButton: "text-violet-600",
    formFieldAction: "text-violet-600 hover:text-violet-500",
    alternativeMethodsBlockButton:
      "border border-zinc-300 text-zinc-800 hover:bg-zinc-50 rounded-lg",
    otpCodeFieldInput: "border-zinc-300 focus:border-violet-500",
    modalContent: "bg-transparent",
    modalCloseButton: "text-zinc-500 hover:text-zinc-800",
  },
} as ClerkAppearanceTheme;
