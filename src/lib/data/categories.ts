import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryInput } from "@/lib/validation/category";
import { DomainError, PG_UNIQUE_VIOLATION } from "./errors";

export type Category = {
  id: string;
  name: string;
  color: string;
  expenseCount: number;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  expenses?: { count: number }[];
};

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, color: row.color, expenseCount: row.expenses?.[0]?.count ?? 0 };
}

// expenseCount includes expenses in the trash: they also need a replacement before deletion.
export async function listCategories(db: SupabaseClient): Promise<Category[]> {
  const { data, error } = await db
    .from("categories")
    .select("id,name,color,expenses(count)")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as CategoryRow[]).map(toCategory);
}

export async function createCategory(db: SupabaseClient, input: CategoryInput): Promise<Category> {
  const { data, error } = await db.from("categories").insert(input).select("id,name,color").single();
  if (error?.code === PG_UNIQUE_VIOLATION) throw new DomainError("duplicate_name");
  if (error) throw error;
  return toCategory(data);
}

export async function updateCategory(db: SupabaseClient, id: string, input: CategoryInput): Promise<Category> {
  const { data, error } = await db
    .from("categories")
    .update(input)
    .eq("id", id)
    .select("id,name,color,expenses(count)")
    .maybeSingle();
  if (error?.code === PG_UNIQUE_VIOLATION) throw new DomainError("duplicate_name");
  if (error) throw error;
  if (!data) throw new DomainError("not_found");
  return toCategory(data as CategoryRow);
}

const RPC_ERRORS = ["category_not_found", "last_category", "replacement_required", "replacement_invalid"] as const;

// Reassigns the category's expenses and deletes it in one DB transaction.
export async function deleteCategory(db: SupabaseClient, id: string, replacementId: string | null): Promise<void> {
  const { error } = await db.rpc("delete_category", { p_id: id, p_replacement_id: replacementId });
  if (!error) return;
  const code = RPC_ERRORS.find((c) => error.message === c);
  if (code === "category_not_found") throw new DomainError("not_found");
  if (code) throw new DomainError(code);
  throw error;
}
