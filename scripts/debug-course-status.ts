/**
 * Zero-cost, read-only diagnostic: queries the courses table directly via
 * the service-role key (bypassing RLS/Clerk auth, since this runs outside
 * a request context) to check on in-progress/failed classification without
 * making any Gemini calls. Prints the most recent courses and their
 * status/generation_error/classification_started_at.
 *
 * Usage: node --env-file=.env.local -r tsx/cjs scripts/debug-course-status.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, title, topic, depth, session_length, status, classification_started_at, generation_error, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }

  for (const course of data ?? []) {
    const startedAt = course.classification_started_at
      ? new Date(course.classification_started_at)
      : null;
    const ageSeconds = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 1000) : null;
    console.log("----------------------------------------");
    console.log("id:", course.id);
    console.log("title:", course.title, "| topic:", course.topic);
    console.log("depth:", course.depth, "| session_length:", course.session_length);
    console.log("status:", course.status);
    console.log(
      "classification_started_at:",
      course.classification_started_at,
      ageSeconds !== null ? `(${ageSeconds}s ago)` : "",
    );
    console.log("generation_error:", course.generation_error);
    console.log("created_at:", course.created_at);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
