import { AuthEntry } from "@/components/auth/auth-entry";
import { AuthShell } from "@/components/auth/auth-shell";
import { SIGN_UP_SUBTITLE } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <AuthShell subtitle={SIGN_UP_SUBTITLE}>
      <AuthEntry mode="sign-up" />
    </AuthShell>
  );
}
