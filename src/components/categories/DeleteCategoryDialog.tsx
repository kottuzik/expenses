"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CategoryDot } from "@/components/ui/CategoryDot";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { queryKeys } from "@/hooks/queries";
import { useOnline } from "@/hooks/useOnline";
import { ApiError, apiFetch, errorMessage } from "@/lib/api/client";
import type { Category } from "@/lib/data/categories";
import styles from "./categories.module.css";

type Props = { category: Category | null; categories: Category[]; onClose: () => void };

export function DeleteCategoryDialog({ category, categories, onClose }: Props) {
  if (!category) return null;
  return <DeleteCategory key={category.id} category={category} categories={categories} onClose={onClose} />;
}

function expensesLabel(count: number): string {
  return count === 1 ? "הוצאה אחת" : `${count} הוצאות`;
}

// A category with expenses (including ones in the trash) can be deleted only
// after choosing where to move them; the server does both in one transaction.
function DeleteCategory({ category, categories, onClose }: { category: Category; categories: Category[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const [replacementId, setReplacementId] = useState("");
  const [needsReplacement, setNeedsReplacement] = useState(category.expenseCount > 0);
  const [error, setError] = useState<string | null>(null);
  const others = categories.filter((c) => c.id !== category.id);

  const remove = useMutation({
    mutationFn: () =>
      apiFetch(`/api/categories/${category.id}`, {
        method: "DELETE",
        body: { replacementId: replacementId || null },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
      toast("הקטגוריה נמחקה");
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "replacement_required") {
        // Expenses were added meanwhile on another device.
        setNeedsReplacement(true);
        setError("לקטגוריה יש הוצאות – יש לבחור לאן להעביר אותן");
        void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      } else if (err instanceof ApiError && err.code === "last_category") {
        setError("לא ניתן למחוק את הקטגוריה האחרונה – חייבת להישאר לפחות קטגוריה אחת");
      } else if (err instanceof ApiError && err.code === "replacement_invalid") {
        setError("הקטגוריה החלופית לא נמצאה – יש לבחור קטגוריה אחרת");
        void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      } else if (err instanceof ApiError && err.code === "not_found") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
        onClose();
      } else {
        setError(errorMessage(err));
      }
    },
  });

  const confirm = () => {
    if (needsReplacement && !replacementId) {
      setError("יש לבחור קטגוריה חלופית");
      return;
    }
    setError(null);
    remove.mutate();
  };

  return (
    <ConfirmDialog
      open
      title={`מחיקת הקטגוריה ״${category.name}״`}
      confirmLabel={needsReplacement ? "העברה ומחיקה" : "מחיקה"}
      cancelLabel="ביטול"
      danger
      confirmDisabled={!online || remove.isPending}
      onConfirm={confirm}
      onCancel={onClose}
    >
      {needsReplacement ? (
        <>
          <p className="body-large">
            לקטגוריה {category.expenseCount > 0 ? `יש ${expensesLabel(category.expenseCount)}` : "יש הוצאות"}. לאן להעביר
            אותן?
          </p>
          <SelectField
            label="קטגוריה חלופית"
            value={replacementId}
            onChange={(event) => setReplacementId(event.target.value)}
            adornment={(() => {
              const chosen = others.find((c) => c.id === replacementId);
              return chosen ? <CategoryDot color={chosen.color} /> : undefined;
            })()}
          >
            <option value="">בחירת קטגוריה</option>
            {others.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
        </>
      ) : (
        <p className="body-large">למחוק את הקטגוריה? לא ניתן לבטל פעולה זו.</p>
      )}
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
    </ConfirmDialog>
  );
}
