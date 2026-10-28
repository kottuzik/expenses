import { afterEach, describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_MS, checkSession } from "@/lib/auth/session";
import { now, setNow } from "@/lib/clock";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedInClient } from "./helpers";

async function sessionId(client: Awaited<ReturnType<typeof signedInClient>>): Promise<string> {
  const { data } = await client.auth.getClaims();
  return data!.claims.session_id as string;
}

async function sessionExists(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("session_created_at", { p_session_id: id });
  if (error) throw error;
  return data !== null;
}

describe("server-side session check (Development)", () => {
  afterEach(() => setNow(null));

  it("accepts a fresh session", async () => {
    const client = await signedInClient();
    expect(await checkSession(client)).toBe(true);
    await client.auth.signOut({ scope: "local" });
  });

  it("rejects and revokes a session older than 30 days (shifted clock)", async () => {
    const client = await signedInClient();
    const id = await sessionId(client);

    setNow(new Date(now().getTime() + SESSION_MAX_AGE_MS + 60 * 60 * 1000));
    expect(await checkSession(client)).toBe(false);
    expect(await sessionExists(id)).toBe(false);
  });

  it("rejects a session after logout", async () => {
    const client = await signedInClient();
    const id = await sessionId(client);
    expect(await sessionExists(id)).toBe(true);

    await client.auth.signOut({ scope: "local" });
    expect(await sessionExists(id)).toBe(false);
    expect(await checkSession(client)).toBe(false);
  });
});
