import { z } from "zod";
import { clientIp, countRecentFailures, hashIp, isBlocked, recordFailure } from "@/lib/auth/rate-limit";
import { serverEnv } from "@/lib/env";
import { forbidden, isSameOrigin } from "@/lib/security/origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const env = serverEnv();
  if (!isSameOrigin(request.headers.get("origin"), env.SITE_URL)) return forbidden();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const admin = createAdminClient();
  const ipHash = hashIp(clientIp(request.headers));
  if (isBlocked(await countRecentFailures(admin, "login", ipHash))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  // The family email is looked up by the fixed user id, never typed by the user.
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(env.FAMILY_USER_ID);
  const email = userData?.user?.email;
  if (userError || !email) return Response.json({ error: "server_error" }, { status: 500 });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });

  if (error) {
    if (error.status === 429) return Response.json({ error: "rate_limited" }, { status: 429 });
    if (error.status === 400) {
      await recordFailure(admin, "login", ipHash);
      return Response.json({ error: "invalid_password" }, { status: 401 });
    }
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
