"use client";

import { useEffect, useRef } from "react";

import { syncLearnerChromeCookies } from "@/app/actions/onboarding";
import { useLearnerPrefs } from "@/components/preferences/learner-prefs-provider";
import type { FontStyle, PreferredLanguage } from "@/types/database";

/**
 * When a page already loaded the profile, keep chrome cookies + client
 * provider aligned so the next navigation doesn't need a layout DB fetch.
 */
export function ChromeCookieSync({
  language,
  fontStyle,
}: {
  language: PreferredLanguage;
  fontStyle: FontStyle;
}) {
  const { language: currentLang, fontStyle: currentFont, applyChrome } =
    useLearnerPrefs();
  const synced = useRef<string | null>(null);

  useEffect(() => {
    const key = `${language}:${fontStyle}`;
    if (synced.current === key) return;
    synced.current = key;

    if (currentLang !== language || currentFont !== fontStyle) {
      applyChrome(language, fontStyle);
    }
    void syncLearnerChromeCookies(language, fontStyle);
  }, [language, fontStyle, currentLang, currentFont, applyChrome]);

  return null;
}
