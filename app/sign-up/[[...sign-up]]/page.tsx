import { AuthEntry } from "@/components/auth/auth-entry";

export default function SignUpPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <AuthEntry mode="sign-up" />
    </div>
  );
}
