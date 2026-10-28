import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const ORIGIN = "http://localhost:3000";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("סיסמה", { exact: true }).fill(process.env.E2E_FAMILY_PASSWORD!);
  await page.getByRole("button", { name: "התחברות" }).click();
  await expect(page.getByRole("heading", { name: "לוח בקרה" })).toBeVisible();
}

// Failed attempts from these tests must not block later runs.
test.afterAll(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  await admin.from("login_attempts").delete().gte("id", 0);
});

test.describe("without a session", () => {
  test("protected pages redirect to login", async ({ page }) => {
    for (const path of ["/", "/more", "/expenses"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("protected API returns 401", async ({ request }) => {
    const response = await request.get("/api/auth/session");
    expect(response.status()).toBe(401);
  });

  test("login screen is Hebrew RTL with a password field only", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.getByLabel("סיסמה", { exact: true })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.getByText("הרשמה")).toHaveCount(0);
  });

  test("wrong password shows an error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("סיסמה", { exact: true }).fill("definitely-wrong-password");
    await page.getByRole("button", { name: "התחברות" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("הסיסמה שגויה");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("with a session", () => {
  test("login, navigate and logout", async ({ page, isMobile }) => {
    await login(page);
    const response = await page.request.get("/api/auth/session");
    expect(response.status()).toBe(200);

    if (isMobile) {
      const bottomNav = page.locator("nav").filter({ has: page.getByRole("link", { name: "עוד" }) }).last();
      await expect(bottomNav.getByRole("link")).toHaveCount(4);
      await bottomNav.getByRole("link", { name: "עוד" }).click();
      await expect(page.getByRole("heading", { name: "עוד" })).toBeVisible();
      await page.getByRole("main").getByRole("button", { name: "התנתקות" }).click();
    } else {
      const sideNav = page.getByRole("navigation", { name: "ניווט ראשי" }).first();
      await expect(sideNav).toBeVisible();
      const box = await sideNav.boundingBox();
      expect(box!.x).toBeGreaterThan(1280 / 2); // right side in RTL
      await expect(sideNav.getByText("בקרוב").first()).toBeVisible();
      await sideNav.getByRole("link", { name: "הוצאות" }).click();
      await expect(page.getByRole("heading", { name: "הוצאות" })).toBeVisible();
      await sideNav.getByRole("button", { name: "התנתקות" }).click();
    }

    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.get("/api/auth/session")).status()).toBe(401);
  });

  test("only one navigation is visible per layout", async ({ page, isMobile }) => {
    await login(page);
    const visibleNavs = page.getByRole("navigation", { name: "ניווט ראשי" }).filter({ visible: true });
    await expect(visibleNavs).toHaveCount(1);
    const links = visibleNavs.getByRole("link");
    if (isMobile) await expect(links).toHaveCount(4);
    else await expect(links.filter({ hasText: "לוח בקרה" })).toHaveCount(1);
  });
});

test.describe("API protections", () => {
  test.skip(({ isMobile }) => isMobile, "API checks run once");

  test("login from a foreign origin is rejected (CSRF)", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      headers: { Origin: "https://evil.example" },
      data: { password: process.env.E2E_FAMILY_PASSWORD },
    });
    expect(response.status()).toBe(403);
  });

  test("repeated failed logins are temporarily blocked", async ({ request }) => {
    const headers = { Origin: ORIGIN, "x-forwarded-for": "203.0.113.77" };
    for (let i = 0; i < 5; i++) {
      const response = await request.post("/api/auth/login", { headers, data: { password: `wrong-${i}` } });
      expect(response.status()).toBe(401);
    }
    const blocked = await request.post("/api/auth/login", {
      headers,
      data: { password: process.env.E2E_FAMILY_PASSWORD },
    });
    expect(blocked.status()).toBe(429);
  });
});
