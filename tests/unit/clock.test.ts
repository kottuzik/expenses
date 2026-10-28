import { afterEach, describe, expect, it } from "vitest";
import { now, setNow } from "@/lib/clock";

describe("clock", () => {
  afterEach(() => setNow(null));

  it("returns the real time by default", () => {
    const before = Date.now();
    expect(now().getTime()).toBeGreaterThanOrEqual(before);
  });

  it("can be moved and reset", () => {
    const fixed = new Date("2030-01-15T10:00:00Z");
    setNow(fixed);
    expect(now().toISOString()).toBe(fixed.toISOString());
    setNow(null);
    expect(now().getFullYear()).not.toBe(2030);
  });
});
