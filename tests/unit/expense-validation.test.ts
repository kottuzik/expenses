import { afterEach, describe, expect, it } from "vitest";
import { setNow } from "@/lib/clock";
import { expenseFormSchema, expenseInputSchema } from "@/lib/validation/expense";

const CATEGORY = "3f0c8a51-5d2e-4c3b-9a7e-2b1d0f6e8c41";
const valid = { amount: "12.50", expenseDate: "2024-08-12", categoryId: CATEGORY, description: "קניות" };

function fieldError(input: Record<string, unknown>, field: string) {
  const result = expenseInputSchema.safeParse({ ...valid, ...input });
  return result.success ? null : (result.error.issues.find((i) => i.path[0] === field)?.message ?? null);
}

afterEach(() => setNow(null));

describe("expense validation (shared by client and server)", () => {
  it("accepts a valid expense and normalizes the description", () => {
    expect(expenseInputSchema.parse({ ...valid, description: "  קניות  " }).description).toBe("קניות");
    expect(expenseInputSchema.parse({ ...valid, description: "   " }).description).toBeNull();
    expect(expenseInputSchema.parse({ ...valid, description: undefined }).description).toBeNull();
  });

  it.each([
    ["0", "יש להזין סכום גדול מ-0"],
    ["0.00", "יש להזין סכום גדול מ-0"],
    ["-5", "יש להזין סכום חיובי במספרים"],
    ["abc", "יש להזין סכום חיובי במספרים"],
    ["", "יש להזין סכום"],
    ["12.345", "עד שתי ספרות אחרי הנקודה"],
    ["1000000.01", "הסכום המרבי הוא ₪1,000,000"],
    ["2000000", "הסכום המרבי הוא ₪1,000,000"],
  ])("rejects amount %j", (amount, message) => {
    expect(fieldError({ amount }, "amount")).toBe(message);
  });

  it("rejects a numeric (non-string) amount", () => {
    expect(fieldError({ amount: 12.5 }, "amount")).not.toBeNull();
  });

  it.each(["1000000", "1000000.00", "0.01", "12.5", "7"])("accepts amount %j", (amount) => {
    expect(fieldError({ amount }, "amount")).toBeNull();
  });

  it("converts a decimal comma to a dot", () => {
    expect(expenseInputSchema.parse({ ...valid, amount: "12,5" }).amount).toBe("12.5");
  });

  it("checks the date range by Israel's calendar date", () => {
    // 22:30 UTC on 31.12.2024 is already 01.01.2025 in Israel.
    setNow(new Date("2024-12-31T22:30:00Z"));
    expect(fieldError({ expenseDate: "2025-01-01" }, "expenseDate")).toBeNull();
    expect(fieldError({ expenseDate: "2025-01-02" }, "expenseDate")).toBe("לא ניתן לבחור תאריך עתידי");
    expect(fieldError({ expenseDate: "2000-01-01" }, "expenseDate")).toBeNull();
    expect(fieldError({ expenseDate: "1999-12-31" }, "expenseDate")).toBe("התאריך המוקדם ביותר הוא 01.01.2000");
    expect(fieldError({ expenseDate: "2024-02-31" }, "expenseDate")).toBe("יש להזין תאריך תקין");
    expect(fieldError({ expenseDate: undefined }, "expenseDate")).not.toBeNull();
  });

  it("requires a category", () => {
    expect(fieldError({ categoryId: "" }, "categoryId")).toBe("יש לבחור קטגוריה");
    expect(fieldError({ categoryId: undefined }, "categoryId")).toBe("יש לבחור קטגוריה");
  });

  it("limits the description to 200 characters", () => {
    expect(fieldError({ description: "א".repeat(200) }, "description")).toBeNull();
    expect(fieldError({ description: "א".repeat(201) }, "description")).toBe("עד 200 תווים");
  });

  it("form schema reads DD.MM.YYYY and outputs ISO", () => {
    const parsed = expenseFormSchema.parse({ ...valid, expenseDate: "12.08.2024" });
    expect(parsed.expenseDate).toBe("2024-08-12");
    const bad = expenseFormSchema.safeParse({ ...valid, expenseDate: "2024-08-12" });
    expect(bad.success).toBe(false);
  });
});
