import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExpenseInput } from "@/lib/validation/expense";
import { PAGE_SIZE, type ExpenseQuery } from "@/lib/validation/expense-query";
import { DomainError, PG_FOREIGN_KEY_VIOLATION } from "./errors";

export type Expense = {
  id: string;
  amount: string;
  expenseDate: string;
  description: string | null;
  createdAt: string;
  version: number;
  category: { id: string; name: string; color: string };
};

export type ExpensePage = {
  items: Expense[];
  total: number;
  page: number;
  pageSize: number;
};

// amount is cast to text so it never passes through floating point.
// The category is embedded, so renames and color changes show on past expenses too.
const COLUMNS = "id,amount::text,expense_date,description,created_at,version,category:categories(id,name,color)";

type ExpenseRow = {
  id: string;
  amount: string;
  expense_date: string;
  description: string | null;
  created_at: string;
  version: number;
  category: { id: string; name: string; color: string };
};

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    expenseDate: row.expense_date,
    description: row.description,
    createdAt: row.created_at,
    version: row.version,
    category: row.category,
  };
}

function toRow(input: ExpenseInput) {
  return {
    amount: input.amount,
    expense_date: input.expenseDate,
    category_id: input.categoryId,
    description: input.description,
  };
}

export async function listExpenses(db: SupabaseClient, query: ExpenseQuery): Promise<ExpensePage> {
  let request = db.from("expenses").select(COLUMNS, { count: "exact" }).is("deleted_at", null);

  if (query.from) request = request.gte("expense_date", query.from);
  if (query.to) request = request.lte("expense_date", query.to);
  if (query.categoryId) request = request.eq("category_id", query.categoryId);

  // Stable tie-breakers keep pagination consistent between pages.
  const ascending = query.sort.endsWith("_asc");
  if (query.sort.startsWith("date")) {
    request = request
      .order("expense_date", { ascending })
      .order("created_at", { ascending })
      .order("id", { ascending });
  } else {
    request = request
      .order("amount", { ascending })
      .order("expense_date", { ascending: false })
      .order("id", { ascending: true });
  }

  const offset = (query.page - 1) * PAGE_SIZE;
  const { data, error, count } = await request.range(offset, offset + PAGE_SIZE - 1);
  // PostgREST answers 416 when the page is past the end; treat it as an empty page.
  if (error && error.code !== "PGRST103") throw error;

  return {
    items: ((data ?? []) as unknown as ExpenseRow[]).map(toExpense),
    total: count ?? 0,
    page: query.page,
    pageSize: PAGE_SIZE,
  };
}

export async function getExpense(db: SupabaseClient, id: string): Promise<Expense> {
  const { data, error } = await db.from("expenses").select(COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  if (!data) throw new DomainError("not_found");
  return toExpense(data as unknown as ExpenseRow);
}

export async function createExpense(db: SupabaseClient, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await db.from("expenses").insert(toRow(input)).select(COLUMNS).single();
  if (error?.code === PG_FOREIGN_KEY_VIOLATION) throw new DomainError("category_missing");
  if (error) throw error;
  return toExpense(data as unknown as ExpenseRow);
}

export async function updateExpense(db: SupabaseClient, id: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await db
    .from("expenses")
    .update(toRow(input))
    .eq("id", id)
    .is("deleted_at", null)
    .select(COLUMNS)
    .maybeSingle();
  if (error?.code === PG_FOREIGN_KEY_VIOLATION) throw new DomainError("category_missing");
  if (error) throw error;
  if (!data) throw new DomainError("not_found");
  return toExpense(data as unknown as ExpenseRow);
}
