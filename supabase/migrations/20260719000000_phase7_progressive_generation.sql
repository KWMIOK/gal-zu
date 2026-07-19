-- Gal-zu Phase 7: progressive/lazy lesson generation.
--
-- Previously createCourseFromPrompt generated every lesson in a course
-- synchronously in one request (a "complete mastery" course could take
-- 10+ minutes and blow well past any serverless function timeout). Now
-- only the first lesson is generated eagerly; the rest are inserted as
-- 'pending' placeholders carrying everything needed to generate them
-- later (see `generation_plan`), and get filled in lazily — either via a
-- background prefetch after the previous lesson, or synchronously the
-- first time a learner actually opens them (see lib/generation/lazy.ts).

-- content_payload can no longer be NOT NULL — a 'pending' lesson has no
-- content yet by definition.
ALTER TABLE public.lessons
  ALTER COLUMN content_payload DROP NOT NULL,
  ALTER COLUMN content_payload DROP DEFAULT;

ALTER TABLE public.lessons
  ADD COLUMN generation_status text NOT NULL DEFAULT 'ready'
    CHECK (generation_status IN ('pending', 'generating', 'ready', 'failed')),
  ADD COLUMN generation_plan jsonb,
  ADD COLUMN order_index integer NOT NULL DEFAULT 0;

-- Explicit ordering — a bulk insert of many placeholder rows can share the
-- same `created_at` timestamp (Postgres evaluates now() once per
-- statement), which would make `ORDER BY created_at` for lesson sequencing
-- non-deterministic. Backfill existing rows from their current
-- created_at order so nothing shifts for already-generated courses.
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY course_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.lessons
)
UPDATE public.lessons l
SET order_index = ordered.rn
FROM ordered
WHERE l.id = ordered.id;

CREATE INDEX lessons_course_id_order_idx ON public.lessons (course_id, order_index);
