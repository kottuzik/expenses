"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CategoryDot } from "@/components/ui/CategoryDot";
import { useCategories } from "@/hooks/queries";
import { errorMessage } from "@/lib/api/client";
import type { Category } from "@/lib/data/categories";
import { CategoryFormDialog, type CategoryFormMode } from "./CategoryFormDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";
import styles from "./categories.module.css";

const LAST_CATEGORY_HINT_ID = "last-category-hint";

export function CategoriesScreen() {
  const categories = useCategories();
  const [formMode, setFormMode] = useState<CategoryFormMode | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const items = categories.data ?? [];
  const isLast = items.length === 1;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className="h2">קטגוריות</h1>
        <Button variant="secondary" onClick={() => setFormMode({ kind: "new" })}>
          <Plus size={20} aria-hidden />
          הוספת קטגוריה
        </Button>
      </header>

      {categories.isPending && <p className={styles.message}>טוען קטגוריות…</p>}
      {categories.isError && (
        <div className={styles.message} role="alert">
          <p>{errorMessage(categories.error)}</p>
          <Button variant="secondary" onClick={() => categories.refetch()}>
            נסו שוב
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <ul className={styles.list}>
          {items.map((category) => (
            <li key={category.id} className={styles.row}>
              <span className={styles.name}>
                <CategoryDot color={category.color} name={category.name} />
              </span>
              <span className={styles.count}>
                {category.expenseCount === 0
                  ? "אין הוצאות"
                  : category.expenseCount === 1
                    ? "הוצאה אחת"
                    : `${category.expenseCount} הוצאות`}
              </span>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`עריכת ${category.name}`}
                onClick={() => setFormMode({ kind: "edit", category })}
              >
                <Pencil size={20} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`מחיקת ${category.name}`}
                disabled={isLast}
                aria-describedby={isLast ? LAST_CATEGORY_HINT_ID : undefined}
                onClick={() => setDeleting(category)}
              >
                <Trash2 size={20} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {isLast && (
        <p id={LAST_CATEGORY_HINT_ID} className={styles.hint}>
          חייבת להישאר לפחות קטגוריה אחת, ולכן לא ניתן למחוק אותה.
        </p>
      )}

      <CategoryFormDialog mode={formMode} categories={items} onClose={() => setFormMode(null)} />
      <DeleteCategoryDialog category={deleting} categories={items} onClose={() => setDeleting(null)} />
    </section>
  );
}
