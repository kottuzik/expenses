import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";

export const CATEGORIES = [
  { id: "11111111-1111-4111-8111-111111111111", name: "מזון", color: "#84C441", expenseCount: 2 },
  { id: "22222222-2222-4222-8222-222222222222", name: "ביגוד", color: "#EC4899", expenseCount: 0 },
];

type Route = (url: string, init?: RequestInit) => unknown;

// Replaces fetch with canned JSON answers keyed by "METHOD /path".
export function mockApi(routes: Record<string, Route | unknown>) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const path = url.split("?")[0];
      calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      const route = routes[`${method} ${path}`];
      if (route === undefined) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
      const data = typeof route === "function" ? (route as Route)(url, init) : route;
      return new Response(JSON.stringify(data), { status: 200 });
    }),
  );
  return calls;
}

// Providers go in a wrapper so rerender() keeps the same query cache.
export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    ),
  });
}
