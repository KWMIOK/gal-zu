"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/** Shown when Supabase data is unreachable (often missing Clerk JWT template). */
export function SupabaseSetupBanner() {
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="flex items-start gap-2 font-medium">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        Database auth is not fully configured
      </p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
        Create the Clerk{" "}
        <strong>supabase</strong> JWT template (Integrations → Supabase) and
        enable Clerk under Supabase Authentication → Third-party auth.{" "}
        <Link
          href="https://clerk.com/docs/integrations/databases/supabase"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Setup guide
        </Link>
      </p>
    </div>
  );
}
