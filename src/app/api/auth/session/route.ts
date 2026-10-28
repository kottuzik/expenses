import { hasValidSession, unauthorized } from "@/lib/auth/guards";

export async function GET() {
  if (!(await hasValidSession())) return unauthorized();
  return Response.json({ authenticated: true });
}
