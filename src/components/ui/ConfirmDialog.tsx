"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import styles from "./ConfirmDialog.module.css";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  confirmDisabled?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger,
  confirmDisabled,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} onRequestClose={onCancel} variant="alert">
      {children}
      <div className={styles.actions}>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={confirmDisabled}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </Dialog>
  );
}

// Shared wording for leaving a form with unsaved changes (PRD 3.ב).
export function UnsavedChangesDialog({
  open,
  onKeepEditing,
  onDiscard,
}: {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title="יש שינויים שלא נשמרו"
      confirmLabel="המשך עריכה"
      cancelLabel="יציאה ללא שמירה"
      onConfirm={onKeepEditing}
      onCancel={onDiscard}
    >
      <p className="body-large">אם תצאו עכשיו, השינויים יאבדו.</p>
    </ConfirmDialog>
  );
}
