import { z } from "zod";
import { isIsoDate } from "@/lib/dates";

export const PAGE_SIZE = 20;

export const SORT_OPTIONS = [
  { value: "date_desc", label: "תאריך – מהחדש לישן" },
  { value: "date_asc", label: "תאריך – מהישן לחדש" },
  { value: "amount_desc", label: "סכום – מהגבוה לנמוך" },
  { value: "amount_asc", label: "סכום – מהנמוך לגבוה" },
] as const;

export type ExpenseSort = (typeof SORT_OPTIONS)[number]["value"];
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value) as [ExpenseSort, ...ExpenseSort[]];

const optionalIsoDate = z
  .string()
  .refine(isIsoDate, { error: "תאריך לא תקין" })
  .optional();

const fields = {
  from: optionalIsoDate,
  to: optionalIsoDate,
  categoryId: z.uuid().optional(),
  sort: z.enum(SORT_VALUES).default("date_desc"),
  page: z.coerce.number().int().min(1).default(1),
};

// Both edges of the date range are inclusive.
export const expenseQuerySchema = z
  .object(fields)
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    error: "תאריך ההתחלה מאוחר מתאריך הסיום",
    path: ["to"],
  });

export type ExpenseQuery = z.output<typeof expenseQuerySchema>;

function pick(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value === null || value === "" ? undefined : value;
}

const KEYS = ["from", "to", "categoryId", "sort", "page"] as const;

// Server: strict parsing of the request query string.
export function parseExpenseQuery(params: URLSearchParams) {
  return expenseQuerySchema.safeParse(Object.fromEntries(KEYS.map((k) => [k, pick(params, k)])));
}

// Client: page URL is user-editable, so invalid fields fall back to defaults instead of failing.
export function looseExpenseQuery(params: URLSearchParams): ExpenseQuery {
  const raw = Object.fromEntries(
    KEYS.map((k) => {
      const value = pick(params, k);
      return [k, value !== undefined && fields[k].safeParse(value).success ? value : undefined];
    }),
  );
  const parsed = expenseQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : expenseQuerySchema.parse({ ...raw, to: undefined });
}

export function expenseQueryToParams(query: Partial<ExpenseQuery>): URLSearchParams {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.sort && query.sort !== "date_desc") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params;
}
