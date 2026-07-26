"use client";

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";

import { translate, type MessageKey } from "@/lib/i18n/messages";
import {
  DEFAULT_FONT_STYLE,
  DEFAULT_PREFERRED_LANGUAGE,
  fontStyleMeta,
  languageMeta,
  type FontStyle,
  type PreferredLanguage,
} from "@/lib/preferences/language-font";

type LearnerPrefsContextValue = {
  language: PreferredLanguage;
  fontStyle: FontStyle;
  t: (key: MessageKey) => string;
  dir: "ltr" | "rtl";
};

const LearnerPrefsContext = createContext<LearnerPrefsContextValue>({
  language: DEFAULT_PREFERRED_LANGUAGE,
  fontStyle: DEFAULT_FONT_STYLE,
  t: (key) => translate(DEFAULT_PREFERRED_LANGUAGE, key),
  dir: "ltr",
});

/**
 * Applies preferred language (html lang/dir + translations) and font style
 * (data-font-style → CSS) for the whole app, including lesson views.
 */
export function LearnerPrefsProvider({
  language = DEFAULT_PREFERRED_LANGUAGE,
  fontStyle = DEFAULT_FONT_STYLE,
  children,
}: {
  language?: PreferredLanguage;
  fontStyle?: FontStyle;
  children: ReactNode;
}) {
  const dir = languageMeta(language).dir;
  const cssFamily = fontStyleMeta(fontStyle).cssFamily;

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = dir;
    root.dataset.fontStyle = fontStyle;
    root.style.setProperty("--font-learner", cssFamily);
  }, [language, fontStyle, dir, cssFamily]);

  const value: LearnerPrefsContextValue = {
    language,
    fontStyle,
    dir,
    t: (key) => translate(language, key),
  };

  return (
    <LearnerPrefsContext.Provider value={value}>
      {children}
    </LearnerPrefsContext.Provider>
  );
}

export function useLearnerPrefs(): LearnerPrefsContextValue {
  return useContext(LearnerPrefsContext);
}

export function useT() {
  return useLearnerPrefs().t;
}
