import type { CookieOptions } from "@supabase/ssr";

export const authCookieOptions: CookieOptions = {
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
