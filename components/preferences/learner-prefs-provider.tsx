"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
  /** Apply chrome immediately after a successful prefs save (no full reload). */
  applyChrome: (language: PreferredLanguage, fontStyle: FontStyle) => void;
};

const LearnerPrefsContext = createContext<LearnerPrefsContextValue>({
  language: DEFAULT_PREFERRED_LANGUAGE,
  fontStyle: DEFAULT_FONT_STYLE,
  t: (key) => translate(DEFAULT_PREFERRED_LANGUAGE, key),
  dir: "ltr",
  applyChrome: () => undefined,
});

function paintChrome(language: PreferredLanguage, fontStyle: FontStyle) {
  const root = document.documentElement;
  const dir = languageMeta(language).dir;
  const cssFamily = fontStyleMeta(fontStyle).cssFamily;
  root.lang = language;
  root.dir = dir;
  root.dataset.fontStyle = fontStyle;
  root.style.setProperty("--font-learner", cssFamily);
}

/**
 * Applies preferred language (html lang/dir + translations) and font style
 * (data-font-style → CSS) for the whole app, including lesson views.
 */
export function LearnerPrefsProvider({
  language: initialLanguage = DEFAULT_PREFERRED_LANGUAGE,
  fontStyle: initialFontStyle = DEFAULT_FONT_STYLE,
  children,
}: {
  language?: PreferredLanguage;
  fontStyle?: FontStyle;
  children: ReactNode;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [fontStyle, setFontStyle] = useState(initialFontStyle);

  useEffect(() => {
    setLanguage(initialLanguage);
    setFontStyle(initialFontStyle);
  }, [initialLanguage, initialFontStyle]);

  useEffect(() => {
    paintChrome(language, fontStyle);
  }, [language, fontStyle]);

  const applyChrome = useCallback(
    (nextLanguage: PreferredLanguage, nextFontStyle: FontStyle) => {
      setLanguage(nextLanguage);
      setFontStyle(nextFontStyle);
      paintChrome(nextLanguage, nextFontStyle);
    },
    [],
  );

  const value = useMemo<LearnerPrefsContextValue>(
    () => ({
      language,
      fontStyle,
      dir: languageMeta(language).dir,
      t: (key) => translate(language, key),
      applyChrome,
    }),
    [language, fontStyle, applyChrome],
  );

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
