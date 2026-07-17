export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { verifyEnvironment } = await import("@/lib/env");
    verifyEnvironment();
  }
}
