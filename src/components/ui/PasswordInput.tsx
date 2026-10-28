"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";
import styles from "./PasswordInput.module.css";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  label: string;
  error?: string;
};

export function PasswordInput({ label, error, ...props }: PasswordInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.control} ${error ? styles.invalid : ""}`}>
        <Lock aria-hidden className={styles.icon} size={20} />
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          className={styles.input}
          dir="auto"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
        </button>
      </div>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
