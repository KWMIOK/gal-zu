import { AuthEntry } from "@/components/auth/auth-entry";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell subtitle="Create your account to start learning.">
      <AuthEntry mode="sign-up" />
    </AuthShell>
  );
}
