import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoriesScreen } from "@/components/categories/CategoriesScreen";
import { CATEGORIES, mockApi, renderWithProviders } from "./render-helpers";

afterEach(() => vi.unstubAllGlobals());

describe("CategoriesScreen", () => {
  it("lists all categories, including empty ones", async () => {
    mockApi({ "GET /api/categories": { items: CATEGORIES } });
    renderWithProviders(<CategoriesScreen />);
    expect(await screen.findByText("מזון")).toBeInTheDocument();
    expect(screen.getByText("ביגוד")).toBeInTheDocument();
    expect(screen.getByText("אין הוצאות")).toBeInTheDocument();
  });

  it("disables deleting the last category with an explanation", async () => {
    mockApi({ "GET /api/categories": { items: [CATEGORIES[0]] } });
    renderWithProviders(<CategoriesScreen />);
    const button = await screen.findByRole("button", { name: "מחיקת מזון" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/חייבת להישאר לפחות קטגוריה אחת/);
  });

  it("new category defaults to the first unused palette color", async () => {
    mockApi({ "GET /api/categories": { items: CATEGORIES } });
    renderWithProviders(<CategoriesScreen />);
    await screen.findByText("מזון");
    await userEvent.click(screen.getByRole("button", { name: "הוספת קטגוריה" }));
    const dialog = screen.getByRole("dialog", { name: "הוספת קטגוריה" });
    expect(within(dialog).getByRole("radio", { name: "ירוק כהה" })).toBeChecked();
  });

  it("requires a replacement before deleting a category with expenses", async () => {
    const calls = mockApi({ "GET /api/categories": { items: CATEGORIES } });
    renderWithProviders(<CategoriesScreen />);
    await userEvent.click(await screen.findByRole("button", { name: "מחיקת מזון" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/יש 2 הוצאות/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "העברה ומחיקה" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("יש לבחור קטגוריה חלופית");
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });
});
