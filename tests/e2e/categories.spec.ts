import { expect, test, type Page } from "@playwright/test";
import { adminClient, createTestCategory, login, removeTestData, snapshot } from "./helpers";

async function openCategories(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole("link", { name: "עוד" }).click();
    await page.getByRole("main").getByRole("link", { name: "קטגוריות" }).click();
  } else {
    await page.getByRole("navigation", { name: "ניווט ראשי" }).getByRole("link", { name: "קטגוריות" }).click();
  }
  await expect(page.getByRole("heading", { name: "קטגוריות", exact: true })).toBeVisible();
}

test.describe("categories screen", () => {
  let suffix: string;

  test.beforeEach(async ({ page }, testInfo) => {
    suffix = `${testInfo.project.name[0]}${Date.now().toString(36)}`;
    await login(page);
  });

  test.afterEach(async () => {
    await removeTestData(suffix);
  });

  test("add, prevent duplicates, rename and recolor", async ({ page, isMobile }) => {
    const usedId = await createTestCategory(`__test__used ${suffix}`);
    await adminClient()
      .from("expenses")
      .insert({ amount: "15", expense_date: "2023-06-01", category_id: usedId, description: `__test__ old ${suffix}` });

    await page.goto("/");
    await openCategories(page, isMobile);
    for (const name of ["מזון", "ביגוד", "רשויות", "פנאי", "אחר"]) {
      await expect(page.getByRole("listitem").filter({ hasText: name }).first()).toBeVisible();
    }

    await page.getByRole("button", { name: "הוספת קטגוריה" }).click();
    let dialog = page.getByRole("dialog", { name: "הוספת קטגוריה" });
    await dialog.getByLabel("שם הקטגוריה").fill(`__test__new ${suffix}`);
    await dialog.getByRole("radio", { name: "סגול" }).check();
    await snapshot(page, `${isMobile ? "mobile" : "desktop"}-category-form`);
    await dialog.getByRole("button", { name: "שמירה" }).click();
    await expect(page.getByRole("status")).toHaveText("הקטגוריה נוספה");
    await expect(page.getByText(`__test__new ${suffix}`)).toBeVisible();

    // Duplicate after ignoring case and extra spaces.
    await page.getByRole("button", { name: "הוספת קטגוריה" }).click();
    dialog = page.getByRole("dialog", { name: "הוספת קטגוריה" });
    await dialog.getByLabel("שם הקטגוריה").fill(`  __TEST__NEW   ${suffix} `);
    await dialog.getByRole("button", { name: "שמירה" }).click();
    await expect(dialog.getByText("כבר קיימת קטגוריה בשם הזה")).toBeVisible();
    await dialog.getByRole("button", { name: "ביטול" }).click();
    await page.getByRole("button", { name: "יציאה ללא שמירה" }).click();

    // Rename and recolor a category with past expenses; the expense list follows.
    await page.getByRole("button", { name: `עריכת __test__used ${suffix}` }).click();
    dialog = page.getByRole("dialog", { name: "עריכת קטגוריה" });
    await dialog.getByLabel("שם הקטגוריה").fill(`__test__renamed ${suffix}`);
    await dialog.getByRole("radio", { name: "כתום" }).check();
    await dialog.getByRole("button", { name: "שמירה" }).click();
    await expect(page.getByRole("status")).toHaveText("הקטגוריה עודכנה");
    await snapshot(page, `${isMobile ? "mobile" : "desktop"}-categories`);

    await page.goto(`/expenses?categoryId=${usedId}`);
    const row = page.locator("tbody tr").first();
    await expect(row).toContainText(`__test__renamed ${suffix}`);
    await expect(row.locator('[style*="background-color"]')).toHaveCSS("background-color", "rgb(249, 115, 22)");
  });

  test("deleting a category with expenses moves them to a replacement", async ({ page, isMobile }) => {
    const fromId = await createTestCategory(`__test__from ${suffix}`);
    const toName = `__test__to ${suffix}`;
    const toId = await createTestCategory(toName, "#6366F1");
    await adminClient()
      .from("expenses")
      .insert([
        { amount: "1", expense_date: "2023-06-01", category_id: fromId, description: `__test__ a ${suffix}` },
        { amount: "2", expense_date: "2023-06-02", category_id: fromId, description: `__test__ b ${suffix}` },
      ]);

    await page.goto("/");
    await openCategories(page, isMobile);
    await page.getByRole("button", { name: `מחיקת __test__from ${suffix}` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("יש 2 הוצאות");
    await dialog.getByRole("button", { name: "העברה ומחיקה" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("יש לבחור קטגוריה חלופית");
    await dialog.getByLabel("קטגוריה חלופית").selectOption({ label: toName });
    await dialog.getByRole("button", { name: "העברה ומחיקה" }).click();
    await expect(page.getByRole("status")).toHaveText("הקטגוריה נמחקה");
    await expect(page.getByText(`__test__from ${suffix}`)).toHaveCount(0);

    await page.goto(`/expenses?categoryId=${toId}`);
    await expect(page.locator("tbody tr")).toHaveCount(2);

    // An empty category is deleted after a simple confirmation.
    await createTestCategory(`__test__empty ${suffix}`);
    await page.goto("/categories");
    await page.getByRole("button", { name: `מחיקת __test__empty ${suffix}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "מחיקה", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("הקטגוריה נמחקה");
    await expect(page.getByText(`__test__empty ${suffix}`)).toHaveCount(0);
  });
});
