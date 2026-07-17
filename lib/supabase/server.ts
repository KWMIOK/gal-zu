import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env";
import { getClerkSupabaseAccessToken } from "@/lib/supabase/clerk-token";

/** Supabase client for Server Components, Server Actions, and Route Handlers. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const clerkToken = await getClerkSupabaseAccessToken();

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getPublicEnv();

  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can fail in Server Components; middleware refresh handles sessions.
          }
        },
      },
      global: {
        headers: clerkToken
          ? { Authorization: `Bearer ${clerkToken}` }
          : undefined,
      },
    },
  );
}
