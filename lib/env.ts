import { z } from "zod";

const clerkPublishableKeySchema = z
  .string()
  .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required")
  .refine(
    (key) => key.startsWith("pk_test_") || key.startsWith("pk_live_"),
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_",
  )
  .refine(
    (key) => key.length >= 50,
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY looks truncated — copy the full Publishable key from the Clerk dashboard (API Keys).",
  );

const clerkSecretKeySchema = z
  .string()
  .min(1, "CLERK_SECRET_KEY is required")
  .refine(
    (key) => key.startsWith("sk_test_") || key.startsWith("sk_live_"),
    "CLERK_SECRET_KEY must start with sk_test_ or sk_live_",
  );

const publicEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPublishableKeySchema,
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  // Unset until a RevenueCat project + store accounts exist — every call site
  // in lib/capacitor/purchases.ts treats a missing key as "not configured"
  // and no-ops instead of throwing, so the app works fully without these.
  NEXT_PUBLIC_REVENUECAT_IOS_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_REVENUECAT_ANDROID_KEY: z.string().min(1).optional(),
});

const serverEnvSchema = z.object({
  CLERK_SECRET_KEY: clerkSecretKeySchema,
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Unset until the RevenueCat webhook is actually enabled — see
  // app/api/webhooks/revenuecat/route.ts, which 501s while this is unset.
  REVENUECAT_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedPublic: PublicEnv | null = null;
let cachedServer: ServerEnv | null = null;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

/** Validates and returns client-safe environment variables. */
export function getPublicEnv(): PublicEnv {
  if (cachedPublic) {
    return cachedPublic;
  }

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_REVENUECAT_IOS_KEY: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY,
    NEXT_PUBLIC_REVENUECAT_ANDROID_KEY:
      process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Gal-zu public environment is misconfigured:\n${formatZodError(parsed.error)}\n\nCopy .env.local.example to .env.local and fill in your keys.`,
    );
  }

  cachedPublic = parsed.data;
  return cachedPublic;
}

/** Validates and returns server-only environment variables. */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must only be called on the server.");
  }

  if (cachedServer) {
    return cachedServer;
  }

  const parsed = serverEnvSchema.safeParse({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    REVENUECAT_WEBHOOK_SECRET: process.env.REVENUECAT_WEBHOOK_SECRET,
  });

  if (!parsed.success) {
    throw new Error(
      `Gal-zu server environment is misconfigured:\n${formatZodError(parsed.error)}\n\nCopy .env.local.example to .env.local and fill in your keys.`,
    );
  }

  cachedServer = parsed.data;
  return cachedServer;
}

/** Run at startup or via `npm run env:check` to verify all required variables. */
export function verifyEnvironment(): void {
  getPublicEnv();
  if (typeof window === "undefined") {
    getServerEnv();
  }
}
