import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export function anonClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function familyEmail(): Promise<string> {
  const { data, error } = await createAdminClient().auth.admin.getUserById(process.env.FAMILY_USER_ID!);
  if (error || !data.user?.email) throw new Error("Family user not found in Development");
  return data.user.email;
}

// Signs in as the family user and returns a client holding that session in memory.
export async function signedInClient(): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: await familyEmail(),
    password: process.env.E2E_FAMILY_PASSWORD!,
  });
  if (error) throw new Error(`Test sign-in failed: ${error.message}`);
  return client;
}
