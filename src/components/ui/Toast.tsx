"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import styles from "./Toast.module.css";

type Kind = "success" | "error";
type ToastState = { id: number; message: string; kind: Kind } | null;

const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

// One message at a time, announced to screen readers through a live region.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string, kind: Kind = "success") => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toast && (
          <p key={toast.id} className={`${styles.toast} ${styles[toast.kind]}`}>
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
