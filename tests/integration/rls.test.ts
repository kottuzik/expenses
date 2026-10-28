import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, signedInClient } from "./helpers";

const TABLES = ["app_state", "change_signals", "login_attempts"] as const;

describe("RLS and permissions (Development)", () => {
  let family: SupabaseClient;

  beforeAll(async () => {
    family = await signedInClient();
  });

  afterAll(async () => {
    await family.auth.signOut({ scope: "local" });
  });

  it.each(TABLES)("anonymous visitors cannot read %s", async (table) => {
    const { data, error } = await anonClient().from(table).select("*");
    expect(error ?? (data?.length === 0 ? "empty" : null)).toBeTruthy();
  });

  it("anonymous visitors cannot write", async () => {
    const { error } = await anonClient().from("login_attempts").insert({ kind: "login", ip_hash: "x" });
    expect(error).not.toBeNull();
  });

  it("public signup is disabled", async () => {
    const { data, error } = await anonClient().auth.signUp({
      email: `__test__${Date.now()}@example.com`,
      password: "Test-password-123",
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });

  it("the family user can read change_signals only", async () => {
    const signals = await family.from("change_signals").select("data_epoch, auth_epoch");
    expect(signals.error).toBeNull();
    expect(signals.data).toHaveLength(1);

    expect((await family.from("login_attempts").select("*")).error).not.toBeNull();
    expect((await family.from("app_state").select("*")).error).not.toBeNull();
  });

  it("the family user cannot write signals directly", async () => {
    const { error } = await family.from("change_signals").update({ data_epoch: 999 }).eq("id", 1);
    expect(error).not.toBeNull();
  });

  it("the session lookup function is server-only", async () => {
    const id = "00000000-0000-0000-0000-000000000000";
    expect((await anonClient().rpc("session_created_at", { p_session_id: id })).error).not.toBeNull();
    expect((await family.rpc("session_created_at", { p_session_id: id })).error).not.toBeNull();
  });
});
