// Closed category palette (DESIGN.md 2.1). Must match the CHECK constraint in the DB.
export const CATEGORY_COLORS = [
  { hex: "#84C441", name: "ליים" },
  { hex: "#2E7D32", name: "ירוק כהה" },
  { hex: "#14B8A6", name: "טורקיז" },
  { hex: "#3B82F6", name: "כחול" },
  { hex: "#6366F1", name: "אינדיגו" },
  { hex: "#8B5CF6", name: "סגול" },
  { hex: "#EC4899", name: "ורוד" },
  { hex: "#EF4444", name: "אדום" },
  { hex: "#F97316", name: "כתום" },
  { hex: "#F59E0B", name: "ענבר" },
  { hex: "#A16207", name: "חום" },
  { hex: "#6B7280", name: "אפור" },
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number]["hex"];

export const CATEGORY_COLOR_VALUES = CATEGORY_COLORS.map((c) => c.hex) as [CategoryColor, ...CategoryColor[]];

// Default for a new category: the first palette color not used yet.
export function firstUnusedColor(used: string[]): CategoryColor {
  const taken = new Set(used.map((c) => c.toUpperCase()));
  return CATEGORY_COLORS.find((c) => !taken.has(c.hex))?.hex ?? CATEGORY_COLORS[0].hex;
}
