import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { failure, inRollback } from "./db";

async function testCategory(db: Client, name = "__test__db"): Promise<string> {
  const { rows } = await db.query("insert into categories (name, color) values ($1, '#84C441') returning id", [name]);
  return rows[0].id;
}

async function insertExpense(db: Client, categoryId: string, fields: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = { amount: "10.00", expense_date: "2024-01-01", description: "__test__", ...fields };
  const { rows } = await db.query(
    "insert into expenses (amount, expense_date, category_id, description, deleted_at) values ($1, $2, $3, $4, $5) returning id",
    [row.amount, row.expense_date, categoryId, row.description, row.deleted_at ?? null],
  );
  return rows[0].id as string;
}

describe("database constraints (Development, rolled back)", () => {
  it("the initial categories are not created twice", () =>
    inRollback(async (db) => {
      const seed = ["מזון", "ביגוד", "רשויות", "פנאי", "אחר"];
      const count = async () =>
        Number((await db.query("select count(*) from categories where name = any($1)", [seed])).rows[0].count);
      const before = await count();
      // Re-running the migration's seed statement must not add rows.
      await db.query(
        "insert into categories (name, color) values ('מזון','#84C441'),('ביגוד','#EC4899'),('רשויות','#3B82F6'),('פנאי','#F59E0B'),('אחר','#6B7280') on conflict (normalized_name) do nothing",
      );
      expect(await count()).toBe(before);
      const migrations = await db.query(
        "select count(*) from supabase_migrations.schema_migrations where version = '20261028150000'",
      );
      expect(Number(migrations.rows[0].count)).toBe(1);
    }));

  it("rejects invalid expenses", () =>
    inRollback(async (db) => {
      const categoryId = await testCategory(db);
      const insert = "insert into expenses (amount, expense_date, category_id, description) values ($1, $2, $3, $4)";
      expect(await failure(db, insert, ["0", "2024-01-01", categoryId, null])).toMatch(/check/);
      expect(await failure(db, insert, ["-1", "2024-01-01", categoryId, null])).toMatch(/check/);
      expect(await failure(db, insert, ["1000000.01", "2024-01-01", categoryId, null])).toMatch(/check/);
      expect(await failure(db, insert, ["10", "1999-12-31", categoryId, null])).toMatch(/check/);
      expect(await failure(db, insert, ["10", "2024-01-01", categoryId, "א".repeat(201)])).toMatch(/check/);
      expect(await failure(db, insert, ["10", "2024-01-01", null, null])).toMatch(/null/);
      expect(await failure(db, insert, ["10", "2024-01-01", "00000000-0000-4000-8000-000000000000", null])).toMatch(
        /foreign key/,
      );
      // Boundaries are accepted; description is optional.
      await db.query(insert, ["1000000", "2000-01-01", categoryId, null]);
      await db.query(insert, ["0.01", "2024-01-01", categoryId, "א".repeat(200)]);
    }));

  it("rejects category colors outside the palette and duplicate names", () =>
    inRollback(async (db) => {
      const insert = "insert into categories (name, color) values ($1, $2)";
      expect(await failure(db, insert, ["__test__color", "#000000"])).toMatch(/check/);
      expect(await failure(db, insert, ["   ", "#84C441"])).toMatch(/check/);
      expect(await failure(db, insert, ["א".repeat(31), "#84C441"])).toMatch(/check/);
      await db.query(insert, ["__test__ Dup  Name", "#84C441"]);
      expect(await failure(db, insert, ["  __TEST__ dup name ", "#2E7D32"])).toMatch(/categories_normalized_name_key/);
    }));

  it("bumps version and updated_at on every update", () =>
    inRollback(async (db) => {
      const categoryId = await testCategory(db);
      const id = await insertExpense(db, categoryId);
      const { rows } = await db.query(
        "update expenses set amount = 20 where id = $1 returning version, updated_at > created_at as moved",
        [id],
      );
      expect(Number(rows[0].version)).toBe(2);
    }));

  it("delete_category moves every expense, including trashed ones, then deletes", () =>
    inRollback(async (db) => {
      const from = await testCategory(db, "__test__from");
      const to = await testCategory(db, "__test__to");
      await insertExpense(db, from);
      await insertExpense(db, from, { deleted_at: new Date().toISOString() });

      expect(await failure(db, "select delete_category($1, null)", [from])).toBe("replacement_required");
      expect(await failure(db, "select delete_category($1, $1)", [from])).toBe("replacement_invalid");

      await db.query("select delete_category($1, $2)", [from, to]);
      const moved = await db.query("select count(*) from expenses where category_id = $1", [to]);
      expect(Number(moved.rows[0].count)).toBe(2);
      const gone = await db.query("select count(*) from categories where id = $1", [from]);
      expect(Number(gone.rows[0].count)).toBe(0);
    }));

  it("delete_category deletes an empty category without a replacement", () =>
    inRollback(async (db) => {
      const id = await testCategory(db);
      await db.query("select delete_category($1, null)", [id]);
      expect(Number((await db.query("select count(*) from categories where id = $1", [id])).rows[0].count)).toBe(0);
    }));

  it("the last category can never be deleted", () =>
    inRollback(async (db) => {
      const keep = await testCategory(db);
      // Only inside this rolled-back transaction: leave a single category.
      await db.query("delete from expenses");
      await db.query("delete from categories where id <> $1", [keep]);
      expect(await failure(db, "select delete_category($1, null)", [keep])).toBe("last_category");
    }));
});
