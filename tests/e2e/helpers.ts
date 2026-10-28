import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const ORIGIN = "http://localhost:3000";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("סיסמה", { exact: true }).fill(process.env.E2E_FAMILY_PASSWORD!);
  await page.getByRole("button", { name: "התחברות" }).click();
  await expect(page.getByRole("heading", { name: "לוח בקרה" })).toBeVisible();
}

// Server-side client for seeding and removing "__test__" data in Development.
export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
}

export async function createTestCategory(name: string, color = "#14B8A6"): Promise<string> {
  const { data, error } = await adminClient().from("categories").insert({ name, color }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function removeTestData(suffix: string) {
  const admin = adminClient();
  const { data } = await admin.from("categories").select("id").like("name", `__test__%${suffix}`);
  const ids = (data ?? []).map((c) => c.id);
  if (ids.length) await admin.from("expenses").delete().in("category_id", ids);
  await admin.from("expenses").delete().like("description", `__test__%${suffix}`);
  if (ids.length) await admin.from("categories").delete().in("id", ids);
}

// Optional screenshots for manual review: set E2E_SCREENSHOT_DIR to a folder outside the repo.
export async function snapshot(page: Page, name: string) {
  const dir = process.env.E2E_SCREENSHOT_DIR;
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}
