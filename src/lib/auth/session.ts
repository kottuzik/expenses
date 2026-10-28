import type { SupabaseClient } from "@supabase/supabase-js";
import { now } from "@/lib/clock";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function isSessionExpired(createdAt: Date, at: Date): boolean {
  return at.getTime() - createdAt.getTime() > SESSION_MAX_AGE_MS;
}

// Server-side session check: valid JWT, session still present in auth.sessions,
// and not older than 30 days. Invalid sessions are signed out locally.
export async function checkSession(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return false;

  const sessionId = data.claims.session_id;
  if (!sessionId || data.claims.sub !== serverEnv().FAMILY_USER_ID) {
    await signOutQuietly(supabase);
    return false;
  }

  const { data: createdAt, error: rpcError } = await createAdminClient().rpc("session_created_at", {
    p_session_id: sessionId,
  });
  if (rpcError) throw new Error(`Session lookup failed: ${rpcError.message}`);

  if (!createdAt || isSessionExpired(new Date(createdAt as string), now())) {
    await signOutQuietly(supabase);
    return false;
  }
  return true;
}

async function signOutQuietly(supabase: SupabaseClient) {
  // Clears local cookies even when the session is already gone on the server.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}
