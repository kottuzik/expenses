import { serverEnv } from "@/lib/env";
import { forbidden, isSameOrigin } from "@/lib/security/origin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get("origin"), serverEnv().SITE_URL)) return forbidden();

  const supabase = await createClient();
  // Local scope: ends the session on this device only.
  await supabase.auth.signOut({ scope: "local" });
  return Response.json({ ok: true });
}
