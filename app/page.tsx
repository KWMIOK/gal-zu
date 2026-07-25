import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Entry point: signed-in users go to the dashboard; everyone else lands
 * on sign-in (no marketing CTAs or secondary buttons).
 */
export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  redirect("/sign-in");
}
