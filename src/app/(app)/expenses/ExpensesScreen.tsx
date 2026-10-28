"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExpenseFilters, hasFilters } from "@/components/expenses/ExpenseFilters";
import { ExpenseFormDialog, type ExpenseFormMode } from "@/components/expenses/ExpenseFormDialog";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { Pagination } from "@/components/expenses/Pagination";
import { Button } from "@/components/ui/Button";
import { useCategories, useExpenseList } from "@/hooks/queries";
import { errorMessage } from "@/lib/api/client";
import { expenseQueryToParams, looseExpenseQuery, type ExpenseQuery } from "@/lib/validation/expense-query";
import styles from "./expenses.module.css";

export function ExpensesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => looseExpenseQuery(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [formMode, setFormMode] = useState<ExpenseFormMode | null>(null);

  const categories = useCategories();
  const list = useExpenseList(query);

  // Filters, sort and page live in the URL, so refresh and Back keep them.
  // The latest requested query is kept separately: two quick changes must not
  // overwrite each other while the URL update is still in flight.
  const latest = useRef(query);
  useEffect(() => {
    latest.current = query;
  }, [query]);

  const navigate = (next: ExpenseQuery) => {
    latest.current = next;
    const params = expenseQueryToParams(next).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  };
  const changeFilters = (next: Partial<ExpenseQuery>) => navigate({ ...latest.current, ...next, page: 1 });
  const changePage = (page: number) => {
    navigate({ ...latest.current, page });
    window.scrollTo({ top: 0 });
  };
  const clearFilters = () => navigate({ sort: latest.current.sort, page: 1 });

  const openNew = () => setFormMode({ kind: "new" });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className="h2">הוצאות</h1>
        <Button className={styles.desktopAdd} onClick={openNew}>
          <Plus size={20} aria-hidden />
          הוספת הוצאה
        </Button>
      </header>

      <ExpenseFilters
        query={query}
        categories={categories.data ?? []}
        onChange={changeFilters}
        onClear={clearFilters}
      />

      {list.isPending && <p className={styles.message}>טוען הוצאות…</p>}

      {list.isError && (
        <div className={styles.message} role="alert">
          <p>{errorMessage(list.error)}</p>
          <Button variant="secondary" onClick={() => list.refetch()}>
            נסו שוב
          </Button>
        </div>
      )}

      {list.data && list.data.total === 0 && (
        <div className={styles.empty}>
          {hasFilters(query) ? (
            <>
              <p className="body-large">לא נמצאו הוצאות שתואמות לסינון.</p>
              <Button variant="secondary" onClick={clearFilters}>
                ניקוי סינון
              </Button>
            </>
          ) : (
            <p className="body-large">עדיין אין הוצאות. הוסיפו את ההוצאה הראשונה.</p>
          )}
        </div>
      )}

      {list.data && list.data.items.length > 0 && (
        <ExpenseTable
          items={list.data.items}
          onOpen={(expense) => setFormMode({ kind: "edit", id: expense.id })}
          onDuplicate={(expense) => setFormMode({ kind: "duplicate", id: expense.id })}
        />
      )}

      {list.data && (
        <Pagination
          page={query.page}
          total={list.data.total}
          pageSize={list.data.pageSize}
          onPageChange={changePage}
        />
      )}

      <button type="button" className={styles.fab} onClick={openNew} aria-label="הוספת הוצאה">
        <Plus size={28} aria-hidden />
      </button>

      <ExpenseFormDialog mode={formMode} onClose={() => setFormMode(null)} />
    </section>
  );
}
