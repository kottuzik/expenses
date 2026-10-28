import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, signedInClient } from "./helpers";

// categories/expenses are reachable only through the server API (secret key).
describe("categories and expenses are not reachable from the browser", () => {
  let family: SupabaseClient;

  beforeAll(async () => {
    family = await signedInClient();
  });

  afterAll(async () => {
    await family.auth.signOut({ scope: "local" });
  });

  it.each(["categories", "expenses"])("%s cannot be read anonymously or with the family session", async (table) => {
    for (const client of [anonClient(), family]) {
      const { data, error } = await client.from(table).select("id").limit(1);
      expect(error ?? (data?.length === 0 ? "empty" : null)).toBeTruthy();
    }
  });

  it("categories cannot be written from the browser", async () => {
    for (const client of [anonClient(), family]) {
      const { error } = await client.from("categories").insert({ name: "__test__rls", color: "#84C441" });
      expect(error).not.toBeNull();
    }
  });

  it("delete_category cannot be called from the browser", async () => {
    for (const client of [anonClient(), family]) {
      const { error } = await client.rpc("delete_category", {
        p_id: "00000000-0000-4000-8000-000000000000",
        p_replacement_id: null,
      });
      expect(error).not.toBeNull();
    }
  });
});
