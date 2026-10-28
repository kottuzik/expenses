import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell/AppShell";
import { requirePageSession } from "@/lib/auth/guards";

// Private pages are always rendered per request, never prerendered.
export const dynamic = "force-dynamic";

// Defense in depth: the proxy already guards these routes, this re-checks on render.
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requirePageSession();
  return <AppShell>{children}</AppShell>;
}
