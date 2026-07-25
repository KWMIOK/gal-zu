-- Observed learning patterns inferred from app usage (no Gemini spend).
-- Declared preferences stay in learning_styles / neurodivergent_accommodations;
-- this column holds usage-derived affinity so generation can tailor further.
alter table public.user_profiles
  add column if not exists learning_adaptation jsonb not null default '{}'::jsonb;
