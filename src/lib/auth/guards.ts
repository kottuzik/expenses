import { redirect } from "next/navigation";
import { checkSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function hasValidSession(): Promise<boolean> {
  return checkSession(await createClient());
}

export async function requirePageSession(): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");
}

export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
