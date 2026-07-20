-- Gal-zu Phase 7b: surface real generation failures instead of masking them.
--
-- Both classifyAndBuildRoadmap and generateLessonPayload used to catch every
-- failure and silently substitute generic placeholder content — from the
-- learner's point of view this was indistinguishable from a successful
-- generation, and is exactly what produced "useless, repeated" lessons
-- whenever the model calls were failing underneath. That fallback path is
-- being removed in favor of surfacing the real error; this column lets a
-- lesson that failed lazy/background generation persist *why*, so the
-- lesson page can show real debug detail even when the failure happened in
-- a background prefetch rather than the interactive request.

ALTER TABLE public.lessons
  ADD COLUMN generation_error text;
