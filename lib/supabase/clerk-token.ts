import { auth } from "@clerk/nextjs/server";

const DEFAULT_TEMPLATE = "supabase";

/**
 * Mints a Clerk JWT for Supabase RLS (`auth.jwt()->>'sub'`).
 * Returns null if the JWT template is missing or Clerk is unavailable.
 */
export async function getClerkSupabaseAccessToken(): Promise<string | null> {
  const template =
    process.env.CLERK_SUPABASE_JWT_TEMPLATE?.trim() || DEFAULT_TEMPLATE;

  if (template === "none" || template === "off") {
    return null;
  }

  const { getToken } = await auth();

  try {
    return (await getToken({ template })) ?? null;
  } catch (error) {
    const status =
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : undefined;

    if (status === 404) {
      console.warn(
        `[gal-zu] Clerk JWT template "${template}" was not found. ` +
          "In Clerk Dashboard go to Configure → Integrations → Supabase (or JWT templates → create \"supabase\" from the Supabase preset). " +
          "Until then, Supabase RLS may block reads/writes.",
      );
    } else {
      console.warn("[gal-zu] Could not mint Clerk token for Supabase:", error);
    }

    return null;
  }
}
