import "server-only";

import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export const GUEST_COOKIE_NAME = "galzu_guest_id";

const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/**
 * Stable anonymous learner id (cookie). Middleware usually seeds this on
 * first visit; Server Actions may still create it if missing (cookie writes
 * are allowed there). Used as `user_profiles.id` / `courses.user_id` when
 * there is no Clerk session, via the service-role Supabase client.
 */
export async function getGuestId(): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE_NAME)?.value?.trim();
  return existing || null;
}

export async function ensureGuestId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE_NAME)?.value?.trim();
  if (existing) return existing;

  const id = `guest_${randomUUID()}`;
  try {
    jar.set(GUEST_COOKIE_NAME, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
    });
    return id;
  } catch {
    throw new Error(
      "Guest session cookie is missing. Refresh the page to start a free session.",
    );
  }
}
