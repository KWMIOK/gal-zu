import { AuthEntry } from "@/components/auth/auth-entry";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell subtitle="Sign in to continue learning.">
      <AuthEntry mode="sign-in" />
    </AuthShell>
  );
}
