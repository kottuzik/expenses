// CSRF protection for state-changing requests: the Origin header must match SITE_URL.
export function isSameOrigin(originHeader: string | null, siteUrl: string): boolean {
  if (!originHeader) return false;
  try {
    return new URL(originHeader).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

export function forbidden(): Response {
  return Response.json({ error: "forbidden" }, { status: 403 });
}
