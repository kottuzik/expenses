import { z } from "zod";
import { hasValidSession, unauthorized } from "@/lib/auth/guards";
import { DomainError } from "@/lib/data/errors";
import { serverEnv } from "@/lib/env";
import { forbidden, isSameOrigin } from "@/lib/security/origin";

type Handler<C> = (request: Request, context: C) => Promise<Response>;

// Wraps a Route Handler: CSRF check for mutations, server-side session check,
// domain error mapping and no-store caching for private data.
export function apiRoute<C>(handler: Handler<C>, { mutation = false } = {}): Handler<C> {
  return async (request, context) => {
    if (mutation && !isSameOrigin(request.headers.get("origin"), serverEnv().SITE_URL)) return forbidden();
    if (!(await hasValidSession())) return unauthorized();

    let response: Response;
    try {
      response = await handler(request, context);
    } catch (error) {
      if (error instanceof DomainError) {
        response = Response.json({ error: error.code }, { status: error.status });
      } else {
        // No amounts or personal data in logs: only the error message.
        console.error("API error:", error instanceof Error ? error.message : error);
        response = Response.json({ error: "server_error" }, { status: 500 });
      }
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
}

export function invalidRequest(error: z.ZodError): Response {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return Response.json({ error: "invalid_request", fields }, { status: 400 });
}

type Parsed<T> = { data: T; response?: undefined } | { data?: undefined; response: Response };

export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<Parsed<z.output<S>>> {
  const body = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(body ?? {});
  return parsed.success ? { data: parsed.data } : { response: invalidRequest(parsed.error) };
}

const idSchema = z.uuid();

// Route ids that are not UUIDs cannot exist, so they are "not found" rather than a DB error.
export function parseId(id: string): string {
  if (!idSchema.safeParse(id).success) throw new DomainError("not_found");
  return id;
}
