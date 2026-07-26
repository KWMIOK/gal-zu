"use client";

import { ClerkProvider } from "@clerk/nextjs";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import {
  buildClerkAppearance,
  buildClerkSignUpPageAppearance,
  clerkLocalization,
} from "@/lib/clerk-appearance";
import { usePrefersDark } from "@/lib/theme/use-prefers-dark";
import type { ClerkAppearanceTheme } from "@clerk/shared/types";

type ClerkAppearanceBundle = {
  appearance: ClerkAppearanceTheme;
  signUpPageAppearance: ClerkAppearanceTheme;
  isDark: boolean;
};

const ClerkAppearanceContext = createContext<ClerkAppearanceBundle>({
  appearance: buildClerkAppearance(false),
  signUpPageAppearance: buildClerkSignUpPageAppearance(false),
  isDark: false,
});

export function useGalzuClerkAppearance(): ClerkAppearanceBundle {
  return useContext(ClerkAppearanceContext);
}

/**
 * Client ClerkProvider that follows the OS light/dark preference so modals
 * and UserButton match the rest of the app (Tailwind `dark:` + Clerk themes).
 */
export function GalzuClerkProvider({ children }: { children: ReactNode }) {
  const isDark = usePrefersDark();
  const bundle = useMemo<ClerkAppearanceBundle>(
    () => ({
      isDark,
      appearance: buildClerkAppearance(isDark),
      signUpPageAppearance: buildClerkSignUpPageAppearance(isDark),
    }),
    [isDark],
  );

  return (
    <ClerkAppearanceContext.Provider value={bundle}>
      <ClerkProvider
        appearance={bundle.appearance}
        localization={clerkLocalization}
      >
        {children}
      </ClerkProvider>
    </ClerkAppearanceContext.Provider>
  );
}
