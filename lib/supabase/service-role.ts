import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv, getServerEnv } from "@/lib/env";

let serviceClient: SupabaseClient | undefined;

/**
 * Supabase client authenticated with the service role key — bypasses RLS
 * entirely. Only use this from trusted server-only contexts that have no
 * Clerk session to attach (e.g. the RevenueCat webhook route), never from
 * anything reachable with user-controlled input as the acting identity.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient {
  if (serviceClient) {
    return serviceClient;
  }

  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for service-role-only operations like the RevenueCat webhook.",
    );
  }

  serviceClient = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return serviceClient;
}
