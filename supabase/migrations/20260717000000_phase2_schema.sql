-- Gal-zu Phase 2: core schema + RLS (Clerk JWT via Supabase integration)
-- Requires Clerk → Supabase JWT template named "supabase" and Authorization header on requests.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Maps the authenticated subject to a text user id (Clerk `sub` or Supabase Auth UUID).
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'sub', ''),
    NULLIF(auth.uid()::text, '')
  );
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.user_profiles (
  id text PRIMARY KEY,
  learning_styles jsonb NOT NULL DEFAULT '{}'::jsonb,
  neurodivergent_accommodations jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scope_type text NOT NULL CHECK (scope_type IN ('micro', 'unit', 'macro')),
  roadmap_tree jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  title text NOT NULL,
  format text NOT NULL CHECK (
    format IN ('slideshow', 'cheat_sheet', 'quiz', 'script')
  ),
  content_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX courses_user_id_idx ON public.courses (user_id);
CREATE INDEX courses_created_at_idx ON public.courses (created_at DESC);
CREATE INDEX lessons_course_id_idx ON public.lessons (course_id);
CREATE INDEX lessons_course_id_created_at_idx ON public.lessons (course_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER user_profiles_set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER lessons_set_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- user_profiles: owner-only (id matches JWT sub / auth.uid())
CREATE POLICY user_profiles_select_own
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = public.auth_user_id());

CREATE POLICY user_profiles_insert_own
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = public.auth_user_id());

CREATE POLICY user_profiles_update_own
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = public.auth_user_id())
  WITH CHECK (id = public.auth_user_id());

CREATE POLICY user_profiles_delete_own
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (id = public.auth_user_id());

-- courses: owner-only via user_id
CREATE POLICY courses_select_own
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (user_id = public.auth_user_id());

CREATE POLICY courses_insert_own
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.auth_user_id());

CREATE POLICY courses_update_own
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (user_id = public.auth_user_id())
  WITH CHECK (user_id = public.auth_user_id());

CREATE POLICY courses_delete_own
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (user_id = public.auth_user_id());

-- lessons: accessible only when parent course belongs to caller
CREATE POLICY lessons_select_own
  ON public.lessons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = lessons.course_id
        AND c.user_id = public.auth_user_id()
    )
  );

CREATE POLICY lessons_insert_own
  ON public.lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = lessons.course_id
        AND c.user_id = public.auth_user_id()
    )
  );

CREATE POLICY lessons_update_own
  ON public.lessons
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = lessons.course_id
        AND c.user_id = public.auth_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = lessons.course_id
        AND c.user_id = public.auth_user_id()
    )
  );

CREATE POLICY lessons_delete_own
  ON public.lessons
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = lessons.course_id
        AND c.user_id = public.auth_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (Supabase roles)
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;

GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.courses TO service_role;
GRANT ALL ON public.lessons TO service_role;
