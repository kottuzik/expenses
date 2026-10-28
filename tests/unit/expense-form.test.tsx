import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpenseFormDialog } from "@/components/expenses/ExpenseFormDialog";
import { setNow } from "@/lib/clock";
import { CATEGORIES, mockApi, renderWithProviders } from "./render-helpers";

const EXISTING = {
  id: "33333333-3333-4333-8333-333333333333",
  amount: "120.00",
  expenseDate: "2024-08-10",
  description: "מסעדה",
  createdAt: "2024-08-10T10:00:00Z",
  version: 1,
  category: CATEGORIES[0],
};

afterEach(() => {
  vi.unstubAllGlobals();
  setNow(null);
});

describe("ExpenseFormDialog", () => {
  it("defaults the date to today and validates required fields", async () => {
    setNow(new Date("2024-08-12T09:00:00Z"));
    mockApi({ "GET /api/categories": { items: CATEGORIES } });
    renderWithProviders(<ExpenseFormDialog mode={{ kind: "new" }} onClose={() => {}} />);

    expect(screen.getByRole("heading", { name: "הוספת הוצאה" })).toBeInTheDocument();
    expect(screen.getByLabelText("תאריך")).toHaveValue("12.08.2024");
    await userEvent.click(screen.getByRole("button", { name: "שמירה" }));

    expect(await screen.findByText("יש להזין סכום")).toBeInTheDocument();
    expect(screen.getByText("יש לבחור קטגוריה")).toBeInTheDocument();
    expect(screen.getByLabelText("סכום (₪)")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows errors for a future date and too many decimals", async () => {
    setNow(new Date("2024-08-12T09:00:00Z"));
    mockApi({ "GET /api/categories": { items: CATEGORIES } });
    renderWithProviders(<ExpenseFormDialog mode={{ kind: "new" }} onClose={() => {}} />);

    const date = screen.getByLabelText("תאריך");
    await userEvent.clear(date);
    await userEvent.type(date, "13.08.2024");
    await userEvent.type(screen.getByLabelText("סכום (₪)"), "10.555");
    await userEvent.click(screen.getByRole("button", { name: "שמירה" }));

    expect(await screen.findByText("לא ניתן לבחור תאריך עתידי")).toBeInTheDocument();
    expect(screen.getByText("עד שתי ספרות אחרי הנקודה")).toBeInTheDocument();
  });

  it("leaves without asking when nothing changed", async () => {
    mockApi({ "GET /api/categories": { items: CATEGORIES } });
    const onClose = vi.fn();
    renderWithProviders(<ExpenseFormDialog mode={{ kind: "new" }} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "ביטול" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("asks before leaving with unsaved changes", async () => {
    mockApi({ "GET /api/categories": { items: CATEGORIES } });
    const onClose = vi.fn();
    renderWithProviders(<ExpenseFormDialog mode={{ kind: "new" }} onClose={onClose} />);

    await userEvent.type(screen.getByLabelText("סכום (₪)"), "50");
    await userEvent.click(screen.getByRole("button", { name: "ביטול" }));
    expect(await screen.findByRole("heading", { name: "יש שינויים שלא נשמרו" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "המשך עריכה" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("סכום (₪)")).toHaveValue("50");

    await userEvent.click(screen.getByRole("button", { name: "ביטול" }));
    await userEvent.click(await screen.findByRole("button", { name: "יציאה ללא שמירה" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("duplicates an expense into a new-expense form and saves it as new", async () => {
    setNow(new Date("2024-08-12T09:00:00Z"));
    const calls = mockApi({
      "GET /api/categories": { items: CATEGORIES },
      [`GET /api/expenses/${EXISTING.id}`]: EXISTING,
      "POST /api/expenses": { ...EXISTING, id: "44444444-4444-4444-8444-444444444444" },
    });
    const onClose = vi.fn();
    renderWithProviders(<ExpenseFormDialog mode={{ kind: "duplicate", id: EXISTING.id }} onClose={onClose} />);

    expect(await screen.findByDisplayValue("מסעדה")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "הוספת הוצאה" })).toBeInTheDocument();
    expect(screen.getByLabelText("סכום (₪)")).toHaveValue("120");
    expect(screen.getByLabelText("תאריך")).toHaveValue("10.08.2024");
    await waitFor(() => expect(screen.getByLabelText("קטגוריה")).toHaveValue(CATEGORIES[0].id));

    await userEvent.click(screen.getByRole("button", { name: "שמירה" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const post = calls.find((c) => c.method === "POST");
    expect(post?.body).toEqual({
      amount: "120",
      expenseDate: "2024-08-10",
      categoryId: CATEGORIES[0].id,
      description: "מסעדה",
    });
  });

  it("edit mode saves with PATCH", async () => {
    setNow(new Date("2024-08-12T09:00:00Z"));
    const calls = mockApi({
      "GET /api/categories": { items: CATEGORIES },
      [`GET /api/expenses/${EXISTING.id}`]: EXISTING,
      [`PATCH /api/expenses/${EXISTING.id}`]: EXISTING,
    });
    renderWithProviders(<ExpenseFormDialog mode={{ kind: "edit", id: EXISTING.id }} onClose={() => {}} />);
    expect(await screen.findByRole("heading", { name: "עריכת הוצאה" })).toBeInTheDocument();
    await screen.findByDisplayValue("מסעדה");
    await waitFor(() => expect(screen.getByLabelText("קטגוריה")).toHaveValue(CATEGORIES[0].id));
    await userEvent.click(screen.getByRole("button", { name: "שמירה" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
  });

  it("reopening uses fresh data, not a copy cached from an earlier opening", async () => {
    let amount = "42.50";
    mockApi({
      "GET /api/categories": { items: CATEGORIES },
      [`GET /api/expenses/${EXISTING.id}`]: () => ({ ...EXISTING, amount }),
    });
    const view = renderWithProviders(<ExpenseFormDialog mode={{ kind: "edit", id: EXISTING.id }} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText("סכום (₪)")).toHaveValue("42.50"));

    // Saved elsewhere meanwhile; the next opening must show the new amount.
    amount = "50.00";
    view.rerender(<ExpenseFormDialog mode={{ kind: "duplicate", id: EXISTING.id }} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText("סכום (₪)")).toHaveValue("50"));
  });

  it("disables saving when offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    mockApi({ "GET /api/categories": { items: CATEGORIES } });
    renderWithProviders(<ExpenseFormDialog mode={{ kind: "new" }} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "שמירה" })).toBeDisabled();
    expect(screen.getByText("אין חיבור לאינטרנט – לא ניתן לשמור כרגע.")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
