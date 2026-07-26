-- Preferred UI/content language + global typography preference.
-- Defaults match the product defaults (English, Standard Clean).

alter table public.user_profiles
  add column if not exists preferred_language text not null default 'en',
  add column if not exists font_style text not null default 'standard_clean';

alter table public.user_profiles
  drop constraint if exists user_profiles_preferred_language_check;

alter table public.user_profiles
  add constraint user_profiles_preferred_language_check
  check (
    preferred_language in (
      'en',
      'es',
      'zh',
      'hi',
      'ar',
      'fr',
      'pt',
      'de'
    )
  );

alter table public.user_profiles
  drop constraint if exists user_profiles_font_style_check;

alter table public.user_profiles
  add constraint user_profiles_font_style_check
  check (
    font_style in (
      'standard_clean',
      'dyslexia_support',
      'max_legibility'
    )
  );

comment on column public.user_profiles.preferred_language is
  'UI + Gemini lesson language (BCP-47-ish codes: en/es/zh/hi/ar/fr/pt/de).';

comment on column public.user_profiles.font_style is
  'Global app + lesson typography: standard_clean | dyslexia_support | max_legibility.';
