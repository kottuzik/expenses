"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./Dialog.module.css";

type DialogProps = {
  open: boolean;
  title: string;
  // Called for X, Esc and backdrop-free close attempts; the owner decides whether to close.
  onRequestClose: () => void;
  // "screen": full screen on mobile, 480px window on desktop. "alert": small centered box.
  variant?: "screen" | "alert";
  children: ReactNode;
};

// Native modal <dialog>: focus is trapped and the page behind is inert.
export function Dialog({ open, title, onRequestClose, variant = "screen", children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[variant]}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
    >
      {open && (
        <div className={styles.inner}>
          <header className={styles.header}>
            <h2 id={titleId} className={variant === "screen" ? "h3" : "h4"}>
              {title}
            </h2>
            {variant === "screen" && (
              <button type="button" className={styles.close} onClick={onRequestClose} aria-label="סגירה">
                <X size={24} aria-hidden />
              </button>
            )}
          </header>
          <div className={styles.body}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
