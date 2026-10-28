import { describe, expect, it } from "vitest";
import { MAX_FAILURES, clientIp, hashIp, isBlocked } from "@/lib/auth/rate-limit";
import { SESSION_MAX_AGE_MS, isSessionExpired } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/security/origin";

describe("isSessionExpired", () => {
  const created = new Date("2026-01-01T00:00:00Z");

  it("accepts a session exactly 30 days old", () => {
    expect(isSessionExpired(created, new Date(created.getTime() + SESSION_MAX_AGE_MS))).toBe(false);
  });

  it("rejects a session older than 30 days", () => {
    expect(isSessionExpired(created, new Date(created.getTime() + SESSION_MAX_AGE_MS + 60_000))).toBe(true);
  });
});

describe("isSameOrigin", () => {
  const site = "http://localhost:3000";

  it("accepts the site origin", () => {
    expect(isSameOrigin("http://localhost:3000", site)).toBe(true);
  });

  it("rejects a foreign or missing origin", () => {
    expect(isSameOrigin("https://evil.example", site)).toBe(false);
    expect(isSameOrigin(null, site)).toBe(false);
    expect(isSameOrigin("not a url", site)).toBe(false);
  });
});

describe("rate limit helpers", () => {
  it("hashes IPs deterministically without exposing them", () => {
    expect(hashIp("1.2.3.4")).toBe(hashIp("1.2.3.4"));
    expect(hashIp("1.2.3.4")).not.toContain("1.2.3.4");
  });

  it("uses the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("blocks from the fifth failure", () => {
    expect(isBlocked(MAX_FAILURES - 1)).toBe(false);
    expect(isBlocked(MAX_FAILURES)).toBe(true);
  });
});
