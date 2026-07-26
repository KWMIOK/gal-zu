import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * App entry: everyone lands in the learn experience. Auth is optional for
 * Quick answer / Overview; Sign Up lives in the header.
 */
export default async function Home() {
  redirect("/dashboard");
}
