"use client";

import { CategoryDot } from "@/components/ui/CategoryDot";
import type { Expense } from "@/lib/data/expenses";
import { formatDisplayDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { RowMenu } from "./RowMenu";
import styles from "./ExpenseTable.module.css";

type Props = {
  items: Expense[];
  onOpen: (expense: Expense) => void;
  onDuplicate: (expense: Expense) => void;
};

// Main text is the description, or the category name when there is none (PRD 4.1).
export function expenseTitle(expense: Expense): string {
  return expense.description ?? expense.category.name;
}

// One semantic table: rows on mobile, a full table with columns on desktop.
export function ExpenseTable({ items, onOpen, onDuplicate }: Props) {
  return (
    <table className={styles.table}>
      <thead className={styles.head}>
        <tr>
          <th scope="col">תיאור</th>
          <th scope="col">קטגוריה</th>
          <th scope="col">תאריך</th>
          <th scope="col">סכום</th>
          <th scope="col">
            <span className="visually-hidden">פעולות</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((expense) => {
          const title = expenseTitle(expense);
          return (
            <tr key={expense.id} className={styles.row} onClick={() => onOpen(expense)}>
              <td className={styles.title}>
                <button
                  type="button"
                  className={styles.open}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(expense);
                  }}
                >
                  {title}
                </button>
              </td>
              <td className={styles.category}>
                <CategoryDot color={expense.category.color} name={expense.category.name} />
              </td>
              <td className={styles.date}>{formatDisplayDate(expense.expenseDate)}</td>
              <td className={styles.amount}>
                <bdi>{formatCurrency(expense.amount)}</bdi>
              </td>
              <td className={styles.actions}>
                <RowMenu label={title} actions={[{ label: "שכפול", onSelect: () => onDuplicate(expense) }]} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
