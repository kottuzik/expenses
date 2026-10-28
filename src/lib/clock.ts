// Single source of "now" for all time-dependent logic, so tests can move the clock.
let fixedNow: Date | null = null;

export function now(): Date {
  return fixedNow ? new Date(fixedNow.getTime()) : new Date();
}

export function setNow(date: Date | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("setNow is available in tests only");
  }
  fixedNow = date ? new Date(date.getTime()) : null;
}
