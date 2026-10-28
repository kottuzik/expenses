import { expect, test, type Page } from "@playwright/test";
import { ORIGIN, adminClient, createTestCategory, login, removeTestData, snapshot } from "./helpers";

const ROWS = "tbody tr";

async function openAddForm(page: Page) {
  await page.getByRole("button", { name: "הוספת הוצאה" }).click();
  const dialog = page.getByRole("dialog", { name: "הוספת הוצאה" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("expenses API protections", () => {
  test.skip(({ isMobile }) => isMobile, "API checks run once");

  test("without a session, data APIs and pages are blocked", async ({ page, request }) => {
    for (const path of ["/api/expenses", "/api/categories"]) {
      expect((await request.get(path)).status()).toBe(401);
      expect((await request.post(path, { headers: { Origin: ORIGIN }, data: {} })).status()).toBe(401);
    }
    expect((await request.patch("/api/categories/x", { headers: { Origin: ORIGIN }, data: {} })).status()).toBe(401);
    for (const path of ["/expenses", "/categories"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("the server rejects invalid data even when the form is bypassed", async ({ page }) => {
    const suffix = `a${Date.now().toString(36)}`;
    const categoryId = await createTestCategory(`__test__api ${suffix}`);
    try {
      await login(page);
      const headers = { Origin: ORIGIN };
      const base = { amount: "10", expenseDate: "2024-01-01", categoryId, description: `__test__ ${suffix}` };
      const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
      const invalid: [Record<string, unknown>, string][] = [
        [{ amount: "0" }, "amount"],
        [{ amount: "-3" }, "amount"],
        [{ amount: "1000000.01" }, "amount"],
        [{ amount: "10.123" }, "amount"],
        [{ expenseDate: tomorrow }, "expenseDate"],
        [{ expenseDate: "1999-12-31" }, "expenseDate"],
        [{ categoryId: undefined }, "categoryId"],
        [{ description: "א".repeat(201) }, "description"],
      ];
      for (const [patch, field] of invalid) {
        const response = await page.request.post("/api/expenses", { headers, data: { ...base, ...patch } });
        expect(response.status(), JSON.stringify(patch)).toBe(400);
        expect((await response.json()).fields[field]).toBeTruthy();
      }

      // The description stays optional.
      const created = await page.request.post("/api/expenses", { headers, data: { ...base, description: null } });
      expect(created.status()).toBe(201);

      const badColor = await page.request.post("/api/categories", {
        headers,
        data: { name: `__test__color ${suffix}`, color: "#000000" },
      });
      expect(badColor.status()).toBe(400);

      const noReplacement = await page.request.delete(`/api/categories/${categoryId}`, { headers, data: {} });
      expect(noReplacement.status()).toBe(409);
      expect((await noReplacement.json()).error).toBe("replacement_required");

      const foreign = await page.request.post("/api/expenses", {
        headers: { Origin: "https://evil.example" },
        data: base,
      });
      expect(foreign.status()).toBe(403);
    } finally {
      await removeTestData(suffix);
    }
  });
});

test.describe("expenses screen", () => {
  let suffix: string;
  let categoryName: string;
  let categoryId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    suffix = `${testInfo.project.name[0]}${Date.now().toString(36)}`;
    categoryName = `__test__cat ${suffix}`;
    categoryId = await createTestCategory(categoryName);
    await login(page);
  });

  test.afterEach(async () => {
    await removeTestData(suffix);
  });

  test("add, edit and duplicate an expense", async ({ page, isMobile }) => {
    await page.goto(`/expenses?categoryId=${categoryId}`);
    await expect(page.getByText("לא נמצאו הוצאות שתואמות לסינון.")).toBeVisible();

    const dialog = await openAddForm(page);
    const box = await dialog.boundingBox();
    if (isMobile) expect(box!.width).toBeGreaterThan(page.viewportSize()!.width - 2);
    else expect(Math.round(box!.width)).toBe(480);
    await snapshot(page, `${isMobile ? "mobile" : "desktop"}-expense-form`);

    await dialog.getByLabel("סכום (₪)").fill("42.5");
    await dialog.getByLabel("קטגוריה").selectOption({ label: categoryName });
    await dialog.getByLabel("תיאור (אופציונלי)").fill(`__test__ ארוחה ${suffix}`);
    await dialog.getByRole("button", { name: "שמירה" }).click();
    await expect(page.getByRole("status")).toHaveText("ההוצאה נשמרה");
    await expect(dialog).toBeHidden();

    const row = page.locator(ROWS).filter({ hasText: `__test__ ארוחה ${suffix}` });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("42.50");
    await expect(row).toContainText(categoryName);

    // Edit: clicking the row opens the form.
    await row.getByRole("button", { name: `__test__ ארוחה ${suffix}`, exact: true }).click();
    const edit = page.getByRole("dialog", { name: "עריכת הוצאה" });
    await expect(edit.getByLabel("סכום (₪)")).toHaveValue("42.50");
    await edit.getByLabel("סכום (₪)").fill("50");
    await edit.getByRole("button", { name: "שמירה" }).click();
    await expect(page.getByRole("status")).toHaveText("ההוצאה עודכנה");
    await expect(row).toContainText("50.00");

    // Duplicate: a prefilled new-expense form that creates another record.
    await row.getByRole("button", { name: `פעולות עבור __test__ ארוחה ${suffix}` }).click();
    await page.getByRole("menuitem", { name: "שכפול" }).click();
    const duplicate = page.getByRole("dialog", { name: "הוספת הוצאה" });
    await expect(duplicate.getByLabel("תיאור (אופציונלי)")).toHaveValue(`__test__ ארוחה ${suffix}`);
    await expect(duplicate.getByLabel("סכום (₪)")).toHaveValue("50");
    await duplicate.getByRole("button", { name: "שמירה" }).click();
    await expect(page.locator(ROWS).filter({ hasText: `__test__ ארוחה ${suffix}` })).toHaveCount(2);

    // Without a description the row shows the category name.
    const noDescription = await openAddForm(page);
    await noDescription.getByLabel("סכום (₪)").fill("7");
    await noDescription.getByLabel("קטגוריה").selectOption({ label: categoryName });
    await noDescription.getByRole("button", { name: "שמירה" }).click();
    await expect(page.locator(ROWS)).toHaveCount(3);
    await expect(page.locator(ROWS).getByRole("button", { name: categoryName, exact: true })).toHaveCount(1);
    await snapshot(page, `${isMobile ? "mobile" : "desktop"}-expenses-list`);
  });

  test("leaving a changed form requires an explicit choice", async ({ page }) => {
    await page.goto("/expenses");
    const dialog = await openAddForm(page);
    await dialog.getByLabel("סכום (₪)").fill("12");

    await dialog.getByRole("button", { name: "ביטול" }).click();
    const warning = page.getByRole("dialog", { name: "יש שינויים שלא נשמרו" });
    await expect(warning).toBeVisible();
    await warning.getByRole("button", { name: "המשך עריכה" }).click();
    await expect(dialog.getByLabel("סכום (₪)")).toHaveValue("12");

    await page.keyboard.press("Escape");
    await expect(warning).toBeVisible();
    await warning.getByRole("button", { name: "המשך עריכה" }).click();

    // The browser Back button is guarded too.
    await page.goBack();
    await expect(warning).toBeVisible();
    await expect(page).toHaveURL(/\/expenses/);
    await warning.getByRole("button", { name: "יציאה ללא שמירה" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "הוצאות", exact: true })).toBeVisible();
  });

  test("filter, sort and paginate against the database", async ({ page }) => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      amount: String(i + 1),
      expense_date: new Date(Date.UTC(2023, 4, 1 + i)).toISOString().slice(0, 10),
      category_id: categoryId,
      description: `__test__ פריט ${i + 1} ${suffix}`,
    }));
    const { error } = await adminClient().from("expenses").insert(rows);
    expect(error).toBeNull();

    await page.goto("/expenses");
    await page.getByLabel("קטגוריה", { exact: true }).selectOption({ label: categoryName });
    await expect(page.getByText("עמוד 1 מתוך 2")).toBeVisible();
    await expect(page.locator(ROWS)).toHaveCount(20);
    await expect(page.locator(ROWS).first()).toContainText("25.05.2023"); // newest first

    await page.getByRole("button", { name: "הבא" }).click();
    await expect(page.getByText("עמוד 2 מתוך 2")).toBeVisible();
    await expect(page.locator(ROWS)).toHaveCount(5);
    await expect(page).toHaveURL(/page=2/);
    await page.getByRole("button", { name: "הקודם" }).click();
    await expect(page.getByText("עמוד 1 מתוך 2")).toBeVisible();

    await page.getByLabel("מיון", { exact: true }).selectOption({ label: "סכום – מהנמוך לגבוה" });
    await expect(page.locator(ROWS).first()).toContainText("1.00");
    await page.getByLabel("מיון", { exact: true }).selectOption({ label: "סכום – מהגבוה לנמוך" });
    await expect(page.locator(ROWS).first()).toContainText("25.00");

    // Inclusive date range: 03.05.2023–05.05.2023 → 3 expenses.
    await page.getByLabel("מתאריך", { exact: true }).fill("03.05.2023");
    await page.getByLabel("עד תאריך", { exact: true }).fill("05.05.2023");
    await expect(page.locator(ROWS)).toHaveCount(3);
    await expect(page.getByRole("navigation", { name: "מעבר בין עמודים" })).toHaveCount(0);

    await page.getByRole("button", { name: "ניקוי סינון" }).first().click();
    await expect(page.getByLabel("מתאריך", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("קטגוריה", { exact: true })).toHaveValue("");
  });

  test("saving is blocked without a connection", async ({ page, context }) => {
    await page.goto("/expenses");
    const dialog = await openAddForm(page);
    await context.setOffline(true);
    await expect(page.getByText("אין חיבור לאינטרנט – לא ניתן לשמור שינויים.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "שמירה" })).toBeDisabled();
    await context.setOffline(false);
    await expect(dialog.getByRole("button", { name: "שמירה" })).toBeEnabled();
  });
});
