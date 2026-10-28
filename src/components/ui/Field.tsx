"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import {
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { MIN_EXPENSE_DATE, formatDisplayDate, parseDisplayDate } from "@/lib/dates";
import styles from "./Field.module.css";

type ShellProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
};

function FieldShell({ id, label, error, hint, children }: ShellProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.control} ${error ? styles.invalid : ""}`}>{children}</div>
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

function a11y(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}

type BaseProps = { label: string; error?: string; hint?: ReactNode };

export function TextField({
  label,
  error,
  hint,
  adornment,
  className,
  ref,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement> & { adornment?: ReactNode; ref?: Ref<HTMLInputElement> }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      {adornment && <span className={styles.adornment}>{adornment}</span>}
      <input ref={ref} className={`${styles.input} ${className ?? ""}`} {...props} {...a11y(id, error)} />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  ref,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea ref={ref} className={`${styles.input} ${styles.textarea}`} rows={3} {...props} {...a11y(id, error)} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  adornment,
  children,
  ref,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { adornment?: ReactNode; ref?: Ref<HTMLSelectElement> }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      {adornment && <span className={styles.adornment}>{adornment}</span>}
      <select ref={ref} className={`${styles.input} ${styles.select}`} {...props} {...a11y(id, error)}>
        {children}
      </select>
      <ChevronDown size={20} aria-hidden className={styles.chevron} />
    </FieldShell>
  );
}

type DateFieldProps = BaseProps & {
  // Displayed text in DD.MM.YYYY; the owner parses it.
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  max: string; // ISO; the built-in picker cannot go past it
  name?: string;
  ref?: Ref<HTMLInputElement>;
};

// Always shows DD.MM.YYYY regardless of device language; the calendar button opens
// the device's own date picker, limited to 2000-01-01..max.
export function DateField({ label, error, hint, value, onChange, onBlur, max, name, ref }: DateFieldProps) {
  const id = useId();
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    picker.value = parseDisplayDate(value) ?? "";
    try {
      picker.showPicker();
    } catch {
      picker.focus();
    }
  };

  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <button type="button" className={styles.iconButton} onClick={openPicker} aria-label={`בחירה מלוח שנה – ${label}`}>
        <CalendarDays size={20} aria-hidden />
      </button>
      <input
        ref={ref}
        name={name}
        className={`${styles.input} ${styles.ltr}`}
        dir="ltr"
        inputMode="numeric"
        placeholder="DD.MM.YYYY"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        {...a11y(id, error)}
      />
      <input
        ref={pickerRef}
        type="date"
        className={styles.picker}
        tabIndex={-1}
        aria-hidden
        min={MIN_EXPENSE_DATE}
        max={max}
        onChange={(event) => {
          if (event.target.value) onChange(formatDisplayDate(event.target.value));
        }}
      />
    </FieldShell>
  );
}
