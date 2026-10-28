import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { now } from "@/lib/clock";

export type AttemptKind = "login" | "reset";

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

export function isBlocked(recentFailures: number): boolean {
  return recentFailures >= MAX_FAILURES;
}

export async function countRecentFailures(
  admin: SupabaseClient,
  kind: AttemptKind,
  ipHash: string,
): Promise<number> {
  const since = new Date(now().getTime() - WINDOW_MS).toISOString();
  const { count, error } = await admin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) throw new Error(`Rate limit lookup failed: ${error.message}`);
  return count ?? 0;
}

export async function recordFailure(admin: SupabaseClient, kind: AttemptKind, ipHash: string): Promise<void> {
  const at = now();
  const { error } = await admin
    .from("login_attempts")
    .insert({ kind, ip_hash: ipHash, created_at: at.toISOString() });
  if (error) throw new Error(`Rate limit insert failed: ${error.message}`);

  // Housekeeping until the daily cron exists (Milestone 4+).
  await admin
    .from("login_attempts")
    .delete()
    .lt("created_at", new Date(at.getTime() - RETENTION_MS).toISOString());
}
