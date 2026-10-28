import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCategory, deleteCategory, updateCategory } from "@/lib/data/categories";
import { DomainError } from "@/lib/data/errors";
import { createExpense, getExpense, listExpenses, updateExpense } from "@/lib/data/expenses";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExpenseQuery } from "@/lib/validation/expense-query";

const db = createAdminClient();
const suffix = Date.now().toString(36);
let categoryId: string;
let otherId: string;

function query(q: Partial<ExpenseQuery>): ExpenseQuery {
  return { sort: "date_desc", page: 1, categoryId, ...q };
}

async function cleanup() {
  const { data } = await db.from("categories").select("id").like("name", `__test__%${suffix}`);
  const ids = (data ?? []).map((c) => c.id);
  if (ids.length) {
    await db.from("expenses").delete().in("category_id", ids);
    await db.from("categories").delete().in("id", ids);
  }
}

describe("expense data layer (Development, __test__ data)", () => {
  beforeAll(async () => {
    categoryId = (await createCategory(db, { name: `__test__list ${suffix}`, color: "#84C441" })).id;
    otherId = (await createCategory(db, { name: `__test__other ${suffix}`, color: "#2E7D32" })).id;
    // 45 expenses, one per day from 2024-01-01; amounts 1..45.
    const rows = Array.from({ length: 45 }, (_, i) => ({
      amount: String(i + 1),
      expense_date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10),
      category_id: categoryId,
      description: `__test__ ${i + 1}`,
    }));
    const { error } = await db.from("expenses").insert(rows);
    if (error) throw error;
    // A trashed expense must never appear in the active list.
    await db.from("expenses").insert({
      amount: "999",
      expense_date: "2024-01-10",
      category_id: categoryId,
      description: "__test__ trashed",
      deleted_at: new Date().toISOString(),
    });
  });

  afterAll(cleanup);

  it("paginates 20 per page with the total", async () => {
    const pages = await Promise.all([1, 2, 3].map((page) => listExpenses(db, query({ page }))));
    expect(pages.map((p) => p.items.length)).toEqual([20, 20, 5]);
    expect(pages.every((p) => p.total === 45)).toBe(true);
    const ids = new Set(pages.flatMap((p) => p.items.map((e) => e.id)));
    expect(ids.size).toBe(45);
    expect((await listExpenses(db, query({ page: 4 }))).items).toEqual([]);
  });

  it("excludes trashed expenses", async () => {
    const all = await listExpenses(db, query({ sort: "amount_desc" }));
    expect(all.items[0].amount).toBe("45.00");
    expect(all.items.some((e) => e.description === "__test__ trashed")).toBe(false);
  });

  it("sorts by date and amount in both directions", async () => {
    expect((await listExpenses(db, query({ sort: "date_desc" }))).items[0].expenseDate).toBe("2024-02-14");
    expect((await listExpenses(db, query({ sort: "date_asc" }))).items[0].expenseDate).toBe("2024-01-01");
    expect((await listExpenses(db, query({ sort: "amount_desc" }))).items[0].amount).toBe("45.00");
    expect((await listExpenses(db, query({ sort: "amount_asc" }))).items[0].amount).toBe("1.00");
  });

  it("filters by an inclusive date range and by category", async () => {
    const range = await listExpenses(db, query({ from: "2024-01-05", to: "2024-01-07" }));
    expect(range.total).toBe(3);
    expect(range.items.map((e) => e.expenseDate).sort()).toEqual(["2024-01-05", "2024-01-06", "2024-01-07"]);
    expect((await listExpenses(db, query({ categoryId: otherId }))).total).toBe(0);
  });

  it("keeps amounts exact as decimal strings", async () => {
    const created = await createExpense(db, {
      amount: "0.10",
      expenseDate: "2024-03-01",
      categoryId: otherId,
      description: null,
    });
    expect(created.amount).toBe("0.10");
    expect(created.description).toBeNull();
    const updated = await updateExpense(db, created.id, {
      amount: "999999.99",
      expenseDate: "2024-03-02",
      categoryId: otherId,
      description: "__test__ updated",
    });
    expect(updated.amount).toBe("999999.99");
    expect(updated.version).toBe(2);
  });

  it("a renamed or recolored category shows on past expenses", async () => {
    await updateCategory(db, categoryId, { name: `__test__renamed ${suffix}`, color: "#F97316" });
    const first = (await listExpenses(db, query({}))).items[0];
    expect(first.category.name).toBe(`__test__renamed ${suffix}`);
    expect(first.category.color).toBe("#F97316");
  });

  it("rejects duplicate category names ignoring case and spaces", async () => {
    await expect(
      createCategory(db, { name: `__TEST__OTHER  ${suffix}`.replace("  ", " "), color: "#84C441" }),
    ).rejects.toMatchObject({ code: "duplicate_name" });
  });

  it("deleting a category with expenses requires and uses a replacement", async () => {
    const extra = await createCategory(db, { name: `__test__extra ${suffix}`, color: "#6366F1" });
    const expense = await createExpense(db, {
      amount: "5",
      expenseDate: "2024-03-03",
      categoryId: extra.id,
      description: "__test__ move me",
    });
    await expect(deleteCategory(db, extra.id, null)).rejects.toMatchObject({ code: "replacement_required" });
    await deleteCategory(db, extra.id, otherId);
    expect((await getExpense(db, expense.id)).category.id).toBe(otherId);
    await expect(deleteCategory(db, extra.id, null)).rejects.toBeInstanceOf(DomainError);
  });

  it("an expense pointing at a missing category is rejected", async () => {
    await expect(
      createExpense(db, {
        amount: "5",
        expenseDate: "2024-03-03",
        categoryId: "00000000-0000-4000-8000-000000000000",
        description: "__test__",
      }),
    ).rejects.toMatchObject({ code: "category_missing" });
  });
});
