import { describe, expect, it } from "vitest";
import { formatDisplayDate, isIsoDate, parseDisplayDate, todayIsrael } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { expenseQueryToParams, looseExpenseQuery, parseExpenseQuery } from "@/lib/validation/expense-query";

describe("dates", () => {
  it("uses Israel's calendar date around midnight", () => {
    expect(todayIsrael(new Date("2024-08-11T21:30:00Z"))).toBe("2024-08-12"); // 00:30 in Israel (summer)
    expect(todayIsrael(new Date("2024-08-11T20:30:00Z"))).toBe("2024-08-11");
    expect(todayIsrael(new Date("2024-01-10T22:10:00Z"))).toBe("2024-01-11"); // 00:10 in Israel (winter)
  });

  it("formats and parses DD.MM.YYYY", () => {
    expect(formatDisplayDate("2024-08-12")).toBe("12.08.2024");
    expect(parseDisplayDate("12.08.2024")).toBe("2024-08-12");
    expect(parseDisplayDate("1.8.2024")).toBe("2024-08-01");
    expect(parseDisplayDate("31.02.2024")).toBeNull();
    expect(parseDisplayDate("2024-08-12")).toBeNull();
    expect(parseDisplayDate("")).toBeNull();
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2023-02-29")).toBe(false);
  });
});

describe("currency", () => {
  it("formats shekels in he-IL", () => {
    const text = formatCurrency("1234.5");
    expect(text).toContain("₪");
    expect(text).toContain("1,234.50");
  });
});

describe("expense list query", () => {
  it("applies defaults", () => {
    const result = parseExpenseQuery(new URLSearchParams());
    expect(result.success && result.data).toEqual({ sort: "date_desc", page: 1 });
  });

  it("rejects a start date after the end date and bad values", () => {
    expect(parseExpenseQuery(new URLSearchParams("from=2024-05-02&to=2024-05-01")).success).toBe(false);
    expect(parseExpenseQuery(new URLSearchParams("from=2024-05-01&to=2024-05-01")).success).toBe(true);
    expect(parseExpenseQuery(new URLSearchParams("sort=name")).success).toBe(false);
    expect(parseExpenseQuery(new URLSearchParams("page=0")).success).toBe(false);
    expect(parseExpenseQuery(new URLSearchParams("categoryId=x")).success).toBe(false);
  });

  it("drops invalid fields from a hand-edited page URL", () => {
    expect(looseExpenseQuery(new URLSearchParams("sort=bad&page=-1&from=2024-01-01"))).toEqual({
      from: "2024-01-01",
      sort: "date_desc",
      page: 1,
    });
  });

  it("round-trips through URL params, omitting defaults", () => {
    expect(expenseQueryToParams({ sort: "date_desc", page: 1 }).toString()).toBe("");
    const params = expenseQueryToParams({ from: "2024-01-01", sort: "amount_asc", page: 3 });
    expect(looseExpenseQuery(params)).toEqual({ from: "2024-01-01", sort: "amount_asc", page: 3 });
  });
});
