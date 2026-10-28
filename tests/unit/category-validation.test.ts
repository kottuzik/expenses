import { describe, expect, it } from "vitest";
import { CATEGORY_COLORS, firstUnusedColor } from "@/lib/categories/palette";
import { categoryInputSchema } from "@/lib/validation/category";

describe("category validation", () => {
  it("trims and collapses spaces in the name", () => {
    expect(categoryInputSchema.parse({ name: "  בית   ספר ", color: "#84C441" }).name).toBe("בית ספר");
  });

  it.each([
    ["", "יש להזין שם"],
    ["    ", "יש להזין שם"],
    ["א".repeat(31), "עד 30 תווים"],
  ])("rejects name %j", (name, message) => {
    const result = categoryInputSchema.safeParse({ name, color: "#84C441" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });

  it("accepts a 30 character name", () => {
    expect(categoryInputSchema.safeParse({ name: "א".repeat(30), color: "#84C441" }).success).toBe(true);
  });

  it.each(["#000000", "#84c441", "red", ""])("rejects color %j outside the palette", (color) => {
    expect(categoryInputSchema.safeParse({ name: "בדיקה", color }).success).toBe(false);
  });

  it("has exactly 12 palette colors", () => {
    expect(CATEGORY_COLORS).toHaveLength(12);
  });

  it("defaults to the first color not in use", () => {
    expect(firstUnusedColor([])).toBe("#84C441");
    expect(firstUnusedColor(["#84C441", "#2e7d32"])).toBe("#14B8A6");
    expect(firstUnusedColor(CATEGORY_COLORS.map((c) => c.hex))).toBe("#84C441");
  });
});
