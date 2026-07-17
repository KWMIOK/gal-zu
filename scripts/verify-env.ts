import { verifyEnvironment } from "../lib/env";

try {
  verifyEnvironment();
  console.log("✓ Gal-zu environment variables are configured.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
