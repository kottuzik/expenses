import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/LoginForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("has a password field only, with no email or signup", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("סיסמה")).toHaveAttribute("type", "password");
    expect(screen.queryByLabelText(/אימייל|email/i)).not.toBeInTheDocument();
    expect(screen.queryByText("הרשמה")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "התחברות" })).toBeInTheDocument();
  });

  it("shows a linked error for an empty password", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "התחברות" }));
    const input = screen.getByLabelText("סיסמה");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("יש להזין סיסמה");
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
  });

  it("shows the server error in Hebrew", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_password" }), { status: 401 }),
    );
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("סיסמה"), "wrong-pass");
    await userEvent.click(screen.getByRole("button", { name: "התחברות" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("הסיסמה שגויה");
  });
});
