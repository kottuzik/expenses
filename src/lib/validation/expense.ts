import { z } from "zod";
import { now } from "@/lib/clock";
import { MIN_EXPENSE_DATE, isIsoDate, parseDisplayDate, todayIsrael } from "@/lib/dates";

// Shared by the form (client) and the API (server), so both reject the same input.

export const MAX_AMOUNT_CENTS = 100_000_000; // ₪1,000,000
export const MAX_DESCRIPTION_LENGTH = 200;

export function normalizeAmount(raw: string): string {
  return raw.trim().replace(",", ".");
}

// Works on the decimal string directly: amounts never pass through floating point.
export function amountError(value: string): string | null {
  if (value === "") return "יש להזין סכום";
  if (!/^\d+(\.\d+)?$/.test(value)) return "יש להזין סכום חיובי במספרים";
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return "עד שתי ספרות אחרי הנקודה";
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents <= 0) return "יש להזין סכום גדול מ-0";
  if (cents > MAX_AMOUNT_CENTS) return "הסכום המרבי הוא ₪1,000,000";
  return null;
}

// "Today" is always Israel's calendar date, computed where the check runs (the server is authoritative).
export function expenseDateError(iso: string): string | null {
  if (!isIsoDate(iso)) return "יש להזין תאריך תקין";
  if (iso < MIN_EXPENSE_DATE) return "התאריך המוקדם ביותר הוא 01.01.2000";
  if (iso > todayIsrael(now())) return "לא ניתן לבחור תאריך עתידי";
  return null;
}

function addError(ctx: z.RefinementCtx, message: string | null) {
  if (message) ctx.addIssue({ code: "custom", message });
}

const amountSchema = z
  .string({ error: "יש להזין סכום" })
  .transform(normalizeAmount)
  .superRefine((value, ctx) => addError(ctx, amountError(value)));

const isoDateSchema = z
  .string({ error: "יש להזין תאריך" })
  .superRefine((value, ctx) => addError(ctx, expenseDateError(value)));

// The form shows DD.MM.YYYY and converts to ISO.
const displayDateSchema = z
  .string({ error: "יש להזין תאריך" })
  .superRefine((value, ctx) => {
    if (value.trim() === "") return addError(ctx, "יש להזין תאריך");
    const iso = parseDisplayDate(value);
    addError(ctx, iso ? expenseDateError(iso) : "יש להזין תאריך בפורמט DD.MM.YYYY");
  })
  .transform((value) => parseDisplayDate(value) as string);

const categoryIdSchema = z.uuid({ error: "יש לבחור קטגוריה" });

const descriptionSchema = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine((value) => value === null || value.length <= MAX_DESCRIPTION_LENGTH, {
    error: `עד ${MAX_DESCRIPTION_LENGTH} תווים`,
  });

export const expenseInputSchema = z.object({
  amount: amountSchema,
  expenseDate: isoDateSchema,
  categoryId: categoryIdSchema,
  description: descriptionSchema,
});

export const expenseFormSchema = z.object({
  amount: amountSchema,
  expenseDate: displayDateSchema,
  categoryId: categoryIdSchema,
  description: descriptionSchema,
});

export type ExpenseInput = z.output<typeof expenseInputSchema>;
export type ExpenseFormValues = z.input<typeof expenseFormSchema>;
