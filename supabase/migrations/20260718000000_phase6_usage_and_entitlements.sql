-- Gal-zu Phase 6: usage tracking (cost-control daily cap) + subscription entitlements.
-- Entitlement columns default every existing/new user to the free tier; RevenueCat's
-- webhook (server/service-role only) is the sole writer of subscription_* columns.

-- ---------------------------------------------------------------------------
-- user_profiles: entitlement columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN plan_tier text NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro')),
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'active', 'grace_period', 'expired', 'cancelled')),
  ADD COLUMN subscription_expires_at timestamptz,
  ADD COLUMN subscription_updated_at timestamptz,
  ADD COLUMN revenuecat_app_user_id text;

CREATE INDEX user_profiles_revenuecat_app_user_id_idx
  ON public.user_profiles (revenuecat_app_user_id)
  WHERE revenuecat_app_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- generation_events: append-only log used to enforce the daily generation cap.
-- One row per Gemini call that actually ran (roadmap classification or a
-- single lesson payload) — see lib/generation/quota.ts for the read side.
-- ---------------------------------------------------------------------------

CREATE TABLE public.generation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('classification', 'lesson')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX generation_events_user_id_created_at_idx
  ON public.generation_events (user_id, created_at DESC);

ALTER TABLE public.generation_events ENABLE ROW LEVEL SECURITY;

-- Immutable log: owners can read their own usage (to show remaining quota)
-- and insert their own events; no update/delete policy is defined on
-- purpose, so rows are append-only for any non-service-role caller.
CREATE POLICY generation_events_select_own
  ON public.generation_events
  FOR SELECT
  TO authenticated
  USING (user_id = public.auth_user_id());

CREATE POLICY generation_events_insert_own
  ON public.generation_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.auth_user_id());

GRANT SELECT, INSERT ON public.generation_events TO authenticated;
GRANT ALL ON public.generation_events TO service_role;
