-- Gal-zu Phase 7c: async course classification
--
-- Root cause of the "An error occurred in the Server Components render"
-- crash on complete_mastery + multi_week: classifyAndBuildRoadmap (a large,
-- retry-with-backoff JSON generation for up to 14 modules) plus the
-- synchronous lesson-1 generation both ran inside the same Server Action
-- invocation that createCourseFromPrompt used, with no ceiling below
-- Vercel's own ~300s function-duration cap. The heaviest tier is exactly
-- the one most likely to need every retry and land right on that edge.
--
-- Fix: course creation now returns almost immediately with a `classifying`
-- placeholder row, and the actual classification + lesson-1 generation
-- happens lazily the moment the course page is opened (ensureCourseClassified
-- in lib/generation/lazy.ts) — the exact same pattern already used for
-- lesson 2+ generation. This makes it retryable/recoverable instead of a
-- dead end if it ever does hit a platform timeout.
alter table public.courses
  add column status text not null default 'ready',
  add column generation_error text,
  add column topic text,
  add column depth text,
  add column session_length text,
  add column classification_started_at timestamptz;

alter table public.courses
  add constraint courses_status_check check (status in ('classifying', 'ready', 'failed'));
