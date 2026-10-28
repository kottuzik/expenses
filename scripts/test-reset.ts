// Deletes all test data from the Supabase Development project.
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "../tests/dev-env";

async function main() {
  loadDevEnv();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

  const { error } = await admin.from("login_attempts").delete().gte("id", 0);
  if (error) throw new Error(`login_attempts: ${error.message}`);

  // Later milestones: delete categories/expenses marked with the "__test__" prefix here.
  console.log("Development test data reset.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
