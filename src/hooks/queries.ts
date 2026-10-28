"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Category } from "@/lib/data/categories";
import type { Expense, ExpensePage } from "@/lib/data/expenses";
import { expenseQueryToParams, type ExpenseQuery } from "@/lib/validation/expense-query";

export const queryKeys = {
  categories: ["categories"] as const,
  expenses: ["expenses"] as const,
  expenseList: (query: ExpenseQuery) => ["expenses", "list", query] as const,
  expense: (id: string) => ["expenses", "item", id] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => apiFetch<{ items: Category[] }>("/api/categories").then((r) => r.items),
  });
}

export function useExpenseList(query: ExpenseQuery) {
  return useQuery({
    queryKey: queryKeys.expenseList(query),
    queryFn: () => apiFetch<ExpensePage>(`/api/expenses?${expenseQueryToParams(query)}`),
    placeholderData: (previous) => previous,
  });
}

export function useExpense(id: string | null) {
  return useQuery({
    queryKey: queryKeys.expense(id ?? ""),
    queryFn: () => apiFetch<Expense>(`/api/expenses/${id}`),
    enabled: id !== null,
    // The form always starts from the latest saved data, never from an earlier copy.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}
