// Browser-side helper for calling our own API. Errors carry the server's error code.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(code);
  }
}

type Options = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown };

export async function apiFetch<T>(path: string, { method = "GET", body }: Options = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "network");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      // Session ended (expired or signed out elsewhere): a full reload to the login
      // screen also drops all cached data in this tab.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
    throw new ApiError(response.status, data?.error ?? "server_error", data?.fields ?? {});
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "network") return "אין חיבור לאינטרנט. השינויים לא נשמרו – נסו שוב כשהחיבור יחזור.";
    if (error.code === "unauthorized") return "ההתחברות הסתיימה. יש להתחבר מחדש.";
  }
  return "משהו השתבש. נסו שוב.";
}
