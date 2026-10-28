// Deletes all test data from the Supabase Development project.
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "../tests/dev-env";

const TEST_PREFIX = "__test__";

async function main() {
  loadDevEnv();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

  const attempts = await admin.from("login_attempts").delete().gte("id", 0);
  if (attempts.error) throw new Error(`login_attempts: ${attempts.error.message}`);

  // Expenses first (categories are ON DELETE RESTRICT): marked by description or by a test category.
  const categories = await admin.from("categories").select("id").like("name", `${TEST_PREFIX}%`);
  if (categories.error) throw new Error(`categories: ${categories.error.message}`);
  const testCategoryIds = categories.data.map((c) => c.id);

  const byDescription = await admin.from("expenses").delete().like("description", `${TEST_PREFIX}%`);
  if (byDescription.error) throw new Error(`expenses: ${byDescription.error.message}`);
  if (testCategoryIds.length) {
    const byCategory = await admin.from("expenses").delete().in("category_id", testCategoryIds);
    if (byCategory.error) throw new Error(`expenses: ${byCategory.error.message}`);
    const removed = await admin.from("categories").delete().in("id", testCategoryIds);
    if (removed.error) throw new Error(`categories: ${removed.error.message}`);
  }

  console.log("Development test data reset.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
