import { cookies } from "next/headers";

import {
  DEFAULT_FONT_STYLE,
  DEFAULT_PREFERRED_LANGUAGE,
  isFontStyle,
  isPreferredLanguage,
  type FontStyle,
  type PreferredLanguage,
} from "@/lib/preferences/language-font";

export const GALZU_LANG_COOKIE = "galzu_lang";
export const GALZU_FONT_COOKIE = "galzu_font";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~13 months

/**
 * Fast chrome prefs for the root layout — cookies only, no Supabase round-trip.
 * Written on preference save (and synced when a page already loaded the profile).
 */
export async function readLearnerChromeCookies(): Promise<{
  language: PreferredLanguage;
  fontStyle: FontStyle;
}> {
  const jar = await cookies();
  const langRaw = jar.get(GALZU_LANG_COOKIE)?.value;
  const fontRaw = jar.get(GALZU_FONT_COOKIE)?.value;
  return {
    language: isPreferredLanguage(langRaw)
      ? langRaw
      : DEFAULT_PREFERRED_LANGUAGE,
    fontStyle: isFontStyle(fontRaw) ? fontRaw : DEFAULT_FONT_STYLE,
  };
}

export async function writeLearnerChromeCookies(
  language: PreferredLanguage,
  fontStyle: FontStyle,
): Promise<void> {
  const jar = await cookies();
  const base = {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax" as const,
  };
  jar.set(GALZU_LANG_COOKIE, language, base);
  jar.set(GALZU_FONT_COOKIE, fontStyle, base);
}
