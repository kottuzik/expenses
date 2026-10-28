"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { UnsavedChangesDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { queryKeys } from "@/hooks/queries";
import { useOnline } from "@/hooks/useOnline";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { ApiError, apiFetch, errorMessage } from "@/lib/api/client";
import { firstUnusedColor } from "@/lib/categories/palette";
import type { Category } from "@/lib/data/categories";
import {
  MAX_CATEGORY_NAME_LENGTH,
  categoryInputSchema,
  type CategoryFormValues,
  type CategoryInput,
} from "@/lib/validation/category";
import { ColorPicker } from "./ColorPicker";
import styles from "./categories.module.css";

export type CategoryFormMode = { kind: "new" } | { kind: "edit"; category: Category };

type Props = { mode: CategoryFormMode | null; categories: Category[]; onClose: () => void };

export function CategoryFormDialog({ mode, categories, onClose }: Props) {
  if (!mode) return null;
  const key = mode.kind === "new" ? "new" : mode.category.id;
  return <CategoryForm key={key} mode={mode} categories={categories} onClose={onClose} />;
}

function CategoryForm({ mode, categories, onClose }: { mode: CategoryFormMode; categories: Category[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, control, handleSubmit, setError, formState } = useForm<CategoryFormValues, unknown, CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    // Validate on save, then live while correcting. Blur-time validation raced
    // with the submit check and could drop errors of untouched fields.
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues:
      mode.kind === "edit"
        ? { name: mode.category.name, color: mode.category.color as CategoryFormValues["color"] }
        : { name: "", color: firstUnusedColor(categories.map((c) => c.color)) },
  });

  const guard = useUnsavedChangesGuard({ open: true, dirty: formState.isDirty, onExit: onClose });

  const save = useMutation({
    mutationFn: (input: CategoryInput) =>
      mode.kind === "edit"
        ? apiFetch<Category>(`/api/categories/${mode.category.id}`, { method: "PATCH", body: input })
        : apiFetch<Category>("/api/categories", { method: "POST", body: input }),
    onSuccess: () => {
      // Names and colors are shown on expenses too, so both lists refresh.
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
      toast(mode.kind === "edit" ? "הקטגוריה עודכנה" : "הקטגוריה נוספה");
      guard.exit();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "duplicate_name") {
        setError("name", { message: "כבר קיימת קטגוריה בשם הזה" });
      } else if (error instanceof ApiError && error.code === "invalid_request") {
        if (error.fields.name) setError("name", { message: error.fields.name });
        if (error.fields.color) setError("color", { message: error.fields.color });
      } else if (error instanceof ApiError && error.code === "not_found") {
        setFormError("הקטגוריה לא נמצאה – ייתכן שנמחקה");
      } else {
        setFormError(errorMessage(error));
      }
    },
  });

  const name = useWatch({ control, name: "name" }) ?? "";
  const color = useWatch({ control, name: "color" });

  return (
    <>
      <Dialog
        open
        title={mode.kind === "edit" ? "עריכת קטגוריה" : "הוספת קטגוריה"}
        onRequestClose={guard.requestExit}
        variant="alert"
      >
        <form
          className={styles.form}
          noValidate
          onSubmit={handleSubmit((input) => {
            setFormError(null);
            save.mutate(input);
          })}
        >
          <TextField
            label="שם הקטגוריה"
            maxLength={MAX_CATEGORY_NAME_LENGTH}
            autoComplete="off"
            hint={`${name.length}/${MAX_CATEGORY_NAME_LENGTH}`}
            error={formState.errors.name?.message}
            {...register("name")}
          />
          <ColorPicker registration={register("color")} selected={color} error={formState.errors.color?.message} />
          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
          <div className={styles.actions}>
            <Button type="submit" disabled={!online || save.isPending}>
              {save.isPending ? "שומר…" : "שמירה"}
            </Button>
            <Button variant="secondary" onClick={guard.requestExit}>
              ביטול
            </Button>
          </div>
        </form>
      </Dialog>
      <UnsavedChangesDialog open={guard.confirming} onKeepEditing={guard.keepEditing} onDiscard={guard.exit} />
    </>
  );
}
