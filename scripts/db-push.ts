// Pushes supabase/migrations to the Development database only.
import { spawnSync } from "node:child_process";
import { loadDevEnv } from "../tests/dev-env";

loadDevEnv();
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is missing in .env");
  process.exit(1);
}

const extraArgs = process.argv.slice(2); // e.g. --dry-run
const result = spawnSync("npx", ["supabase", "db", "push", "--db-url", dbUrl, ...extraArgs], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
