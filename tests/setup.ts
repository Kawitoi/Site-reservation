import { config } from "dotenv";
import { resolve } from "node:path";

// Integration tests must never touch the dev/production database — spec
// section 134 ("DATABASE_URL dédiée aux tests").
config({ path: resolve(__dirname, "../.env.test") });

if (!process.env.DATABASE_URL?.includes("tableflow_test")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL does not look like the test database. Check .env.test."
  );
}
