import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Completes an OAuth sign-in/sign-up. Reached either directly on the web
 * (Clerk's normal redirect flow) or via the native deep-link bridge after
 * the system browser finishes the provider handshake
 * (see `components/mobile/capacitor-auth-bridge.tsx`).
 */
export default function SsoCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-white/60">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/onboarding"
      />
      Finishing sign-in…
    </div>
  );
}
