/**
 * Learner language + typography preferences (profile columns + Gemini/UI).
 */

export type PreferredLanguage =
  | "en"
  | "es"
  | "zh"
  | "hi"
  | "ar"
  | "fr"
  | "pt"
  | "de";

export type FontStyle =
  | "standard_clean"
  | "dyslexia_support"
  | "max_legibility";

export const PREFERRED_LANGUAGE_OPTIONS: {
  value: PreferredLanguage;
  /** Stable English product label (menu option text). */
  label: string;
  /** Native autonym for the picker. */
  nativeLabel: string;
  /** Name passed to Gemini ("generate in …"). */
  geminiName: string;
  dir: "ltr" | "rtl";
}[] = [
  {
    value: "en",
    label: "English",
    nativeLabel: "English",
    geminiName: "English",
    dir: "ltr",
  },
  {
    value: "es",
    label: "Spanish",
    nativeLabel: "Español",
    geminiName: "Spanish",
    dir: "ltr",
  },
  {
    value: "zh",
    label: "Mandarin (Simplified)",
    nativeLabel: "简体中文",
    geminiName: "Mandarin Chinese (Simplified)",
    dir: "ltr",
  },
  {
    value: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    geminiName: "Hindi",
    dir: "ltr",
  },
  {
    value: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    geminiName: "Arabic",
    dir: "rtl",
  },
  {
    value: "fr",
    label: "French",
    nativeLabel: "Français",
    geminiName: "French",
    dir: "ltr",
  },
  {
    value: "pt",
    label: "Portuguese",
    nativeLabel: "Português",
    geminiName: "Portuguese",
    dir: "ltr",
  },
  {
    value: "de",
    label: "German",
    nativeLabel: "Deutsch",
    geminiName: "German",
    dir: "ltr",
  },
];

export const FONT_STYLE_OPTIONS: {
  value: FontStyle;
  label: string;
  hint: string;
  /** CSS font-family stack applied app-wide. */
  cssFamily: string;
}[] = [
  {
    value: "standard_clean",
    label: "Standard Clean",
    hint: "Inter — clear, modern UI type.",
    cssFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  },
  {
    value: "dyslexia_support",
    label: "Dyslexia Support",
    hint: "OpenDyslexic — heavier bottoms, clearer letter shapes.",
    cssFamily: "OpenDyslexic, var(--font-inter), ui-sans-serif, sans-serif",
  },
  {
    value: "max_legibility",
    label: "Max Legibility",
    hint: "Atkinson Hyperlegible — high distinguishability.",
    cssFamily:
      "var(--font-atkinson), Atkinson Hyperlegible, ui-sans-serif, sans-serif",
  },
];

export const DEFAULT_PREFERRED_LANGUAGE: PreferredLanguage = "en";
export const DEFAULT_FONT_STYLE: FontStyle = "standard_clean";

export function isPreferredLanguage(value: unknown): value is PreferredLanguage {
  return PREFERRED_LANGUAGE_OPTIONS.some((option) => option.value === value);
}

export function isFontStyle(value: unknown): value is FontStyle {
  return FONT_STYLE_OPTIONS.some((option) => option.value === value);
}

export function languageMeta(code: PreferredLanguage) {
  return (
    PREFERRED_LANGUAGE_OPTIONS.find((option) => option.value === code) ??
    PREFERRED_LANGUAGE_OPTIONS[0]
  );
}

export function fontStyleMeta(style: FontStyle) {
  return (
    FONT_STYLE_OPTIONS.find((option) => option.value === style) ??
    FONT_STYLE_OPTIONS[0]
  );
}
