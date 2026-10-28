"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { CategoryDot } from "@/components/ui/CategoryDot";
import { UnsavedChangesDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { DateField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { queryKeys, useCategories, useExpense } from "@/hooks/queries";
import { useOnline } from "@/hooks/useOnline";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { ApiError, apiFetch, errorMessage } from "@/lib/api/client";
import { now } from "@/lib/clock";
import type { Expense } from "@/lib/data/expenses";
import { formatDisplayDate, todayIsrael } from "@/lib/dates";
import {
  MAX_DESCRIPTION_LENGTH,
  expenseFormSchema,
  type ExpenseFormValues,
  type ExpenseInput,
} from "@/lib/validation/expense";
import styles from "./ExpenseFormDialog.module.css";

export type ExpenseFormMode = { kind: "new" } | { kind: "edit"; id: string } | { kind: "duplicate"; id: string };

type Props = { mode: ExpenseFormMode | null; onClose: () => void };

// Add, edit and duplicate share one form. Duplicating copies an existing
// expense into a new-expense form; saving creates a new record.
export function ExpenseFormDialog({ mode, onClose }: Props) {
  if (!mode) return null;
  const key = mode.kind === "new" ? "new" : `${mode.kind}-${mode.id}`;
  return <ExpenseForm key={key} mode={mode} onClose={onClose} />;
}

const FIELDS = ["amount", "expenseDate", "categoryId", "description"] as const;

function toFormValues(expense: Expense): ExpenseFormValues {
  return {
    expenseDate: formatDisplayDate(expense.expenseDate),
    amount: expense.amount.replace(/\.00$/, ""),
    categoryId: expense.category.id,
    description: expense.description ?? "",
  };
}

function ExpenseForm({ mode, onClose }: { mode: ExpenseFormMode; onClose: () => void }) {
  const sourceId = mode.kind === "new" ? null : mode.id;
  const source = useExpense(sourceId);
  const categories = useCategories();
  const queryClient = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const [formError, setFormError] = useState<string | null>(null);
  const today = todayIsrael(now());

  // Starting values come only from a completed fresh fetch: a cached copy from
  // an earlier opening may be older than the last save. Latched once, so a
  // background refetch never overwrites what the user is typing.
  const [initial, setInitial] = useState<ExpenseFormValues | null>(null);
  if (!initial && source.data && !source.isFetching) setInitial(toFormValues(source.data));

  const form = useForm<ExpenseFormValues, unknown, ExpenseInput>({
    resolver: zodResolver(expenseFormSchema),
    values: initial ?? undefined,
    // Validate on save, then live while correcting. Blur-time validation raced
    // with the submit check and could drop errors of untouched fields.
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { expenseDate: formatDisplayDate(today), amount: "", categoryId: "", description: "" },
  });
  const { register, control, handleSubmit, setError, formState } = form;


  const guard = useUnsavedChangesGuard({ open: true, dirty: formState.isDirty, onExit: onClose });

  const save = useMutation({
    mutationFn: (input: ExpenseInput) =>
      mode.kind === "edit"
        ? apiFetch<Expense>(`/api/expenses/${mode.id}`, { method: "PATCH", body: input })
        : apiFetch<Expense>("/api/expenses", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      toast(mode.kind === "edit" ? "ההוצאה עודכנה" : "ההוצאה נשמרה");
      guard.exit();
    },
    onError: (error) => {
      // The form keeps its data on failure; nothing is lost until the user leaves.
      if (error instanceof ApiError && error.code === "invalid_request") {
        FIELDS.forEach((field) => {
          if (error.fields[field]) setError(field, { message: error.fields[field] });
        });
        setFormError("יש לתקן את השדות המסומנים");
      } else if (error instanceof ApiError && error.code === "category_missing") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
        setError("categoryId", { message: "הקטגוריה שנבחרה נמחקה – יש לבחור קטגוריה אחרת" });
        setFormError(null);
      } else if (error instanceof ApiError && error.code === "not_found") {
        setFormError("ההוצאה לא נמצאה – ייתכן שנמחקה");
      } else {
        setFormError(errorMessage(error));
      }
    },
  });

  const categoryId = useWatch({ control, name: "categoryId" });
  const description = useWatch({ control, name: "description" }) ?? "";
  const selected = categories.data?.find((c) => c.id === categoryId);
  const title = mode.kind === "edit" ? "עריכת הוצאה" : "הוספת הוצאה";
  const loading = sourceId !== null && !initial && !source.isError;

  return (
    <>
      <Dialog open title={title} onRequestClose={guard.requestExit}>
        {loading && <p className="body-large">טוען…</p>}
        {source.isError && (
          <p className={styles.formError} role="alert">
            {source.error instanceof ApiError && source.error.code === "not_found"
              ? "ההוצאה לא נמצאה – ייתכן שנמחקה"
              : errorMessage(source.error)}
          </p>
        )}
        {!loading && !source.isError && (
          <form
            className={styles.form}
            noValidate
            onSubmit={handleSubmit((input) => {
              setFormError(null);
              save.mutate(input);
            })}
          >
            <Controller
              control={control}
              name="expenseDate"
              render={({ field, fieldState }) => (
                <DateField
                  label="תאריך"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  max={today}
                  error={fieldState.error?.message}
                />
              )}
            />
            <TextField
              label="סכום (₪)"
              inputMode="decimal"
              dir="ltr"
              className={styles.amount}
              autoComplete="off"
              adornment="₪"
              error={formState.errors.amount?.message}
              {...register("amount")}
            />
            <SelectField
              label="קטגוריה"
              adornment={selected ? <CategoryDot color={selected.color} /> : undefined}
              error={formState.errors.categoryId?.message}
              {...register("categoryId")}
            >
              <option value="">בחירת קטגוריה</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="תיאור (אופציונלי)"
              maxLength={MAX_DESCRIPTION_LENGTH}
              hint={`${description.length}/${MAX_DESCRIPTION_LENGTH}`}
              error={formState.errors.description?.message}
              {...register("description")}
            />

            {formError && (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            )}

            <div className={styles.actions}>
              <Button type="submit" fullWidth disabled={!online || save.isPending}>
                {save.isPending ? "שומר…" : "שמירה"}
              </Button>
              <Button variant="secondary" fullWidth onClick={guard.requestExit}>
                ביטול
              </Button>
            </div>
            {!online && <p className={styles.offline}>אין חיבור לאינטרנט – לא ניתן לשמור כרגע.</p>}
          </form>
        )}
      </Dialog>
      <UnsavedChangesDialog open={guard.confirming} onKeepEditing={guard.keepEditing} onDiscard={guard.exit} />
    </>
  );
}
