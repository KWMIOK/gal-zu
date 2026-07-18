/**
 * One-off dev/testing convenience: bumps every existing `user_profiles` row
 * to a given `plan_tier` (default "pro"), bypassing the app's own daily
 * generation cap (lib/generation/quota.ts) for local testing.
 *
 * This is a testing tool, not a billing action — it doesn't touch Gemini,
 * Supabase, or RevenueCat pricing/plans in any way. Uses the service role
 * key directly (bypasses RLS), so only ever run this locally.
 *
 * Usage: node --env-file=.env.local -r tsx/cjs scripts/set-plan-tier.ts [free|pro]
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const tier = (process.argv[2] ?? "pro") as "free" | "pro";
  if (tier !== "free" && tier !== "pro") {
    console.error('Usage: set-plan-tier.ts [free|pro]');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.local).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ plan_tier: tier })
    .not("id", "is", null)
    .select("id, plan_tier");

  if (error) {
    console.error("Failed to update plan_tier:", error.message);
    process.exit(1);
  }

  console.log(`Updated ${data?.length ?? 0} profile(s) to plan_tier="${tier}":`);
  for (const row of data ?? []) {
    console.log(`  - ${row.id}`);
  }
}

main();
