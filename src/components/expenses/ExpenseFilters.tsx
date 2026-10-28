"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DateField, SelectField } from "@/components/ui/Field";
import { now } from "@/lib/clock";
import type { Category } from "@/lib/data/categories";
import { formatDisplayDate, parseDisplayDate, todayIsrael } from "@/lib/dates";
import { SORT_OPTIONS, type ExpenseQuery, type ExpenseSort } from "@/lib/validation/expense-query";
import styles from "./ExpenseFilters.module.css";

type Props = {
  query: ExpenseQuery;
  categories: Category[];
  onChange: (next: Partial<ExpenseQuery>) => void;
  onClear: () => void;
};

export function hasFilters(query: ExpenseQuery): boolean {
  return Boolean(query.from || query.to || query.categoryId);
}

export function ExpenseFilters({ query, categories, onChange, onClear }: Props) {
  const today = todayIsrael(now());

  return (
    <section className={styles.filters} aria-label="סינון ומיון">
      <div className={styles.dates}>
        <DateFilter
          label="מתאריך"
          value={query.from}
          max={today}
          validate={(iso) => (query.to && iso > query.to ? "תאריך ההתחלה מאוחר מתאריך הסיום" : null)}
          onApply={(from) => onChange({ from })}
        />
        <DateFilter
          label="עד תאריך"
          value={query.to}
          max={today}
          validate={(iso) => (query.from && iso < query.from ? "תאריך הסיום מוקדם מתאריך ההתחלה" : null)}
          onApply={(to) => onChange({ to })}
        />
      </div>
      <SelectField
        label="קטגוריה"
        value={query.categoryId ?? ""}
        onChange={(event) => onChange({ categoryId: event.target.value || undefined })}
      >
        <option value="">כל הקטגוריות</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="מיון"
        value={query.sort}
        onChange={(event) => onChange({ sort: event.target.value as ExpenseSort })}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      {hasFilters(query) && (
        <Button variant="tertiary" className={styles.clear} onClick={onClear}>
          ניקוי סינון
        </Button>
      )}
    </section>
  );
}

type DateFilterProps = {
  label: string;
  value: string | undefined;
  max: string;
  validate: (iso: string) => string | null;
  onApply: (iso: string | undefined) => void;
};

// Applies as soon as the text is a complete valid date (or empty); keeps the
// typed text otherwise, and follows external changes such as "clear filters".
function DateFilter({ label, value, max, validate, onApply }: DateFilterProps) {
  const [text, setText] = useState(value ? formatDisplayDate(value) : "");
  const [applied, setApplied] = useState(value);
  const [formatError, setFormatError] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  if (value !== applied) {
    setApplied(value);
    setText(value ? formatDisplayDate(value) : "");
    setFormatError(false);
    setRangeError(null);
  }

  const handleChange = (next: string) => {
    setText(next);
    const iso = next.trim() === "" ? undefined : parseDisplayDate(next);
    setFormatError(iso === null);
    if (iso === null) return;
    const error = iso ? validate(iso) : null;
    setRangeError(error);
    if (!error) {
      setApplied(iso);
      onApply(iso);
    }
  };

  // A half-typed date is only flagged after leaving the field; a range conflict right away.
  const error = rangeError ?? (formatError && touched ? "יש להזין תאריך בפורמט DD.MM.YYYY" : undefined);

  return (
    <DateField
      label={label}
      value={text}
      max={max}
      onChange={handleChange}
      onBlur={() => setTouched(true)}
      error={error}
    />
  );
}
