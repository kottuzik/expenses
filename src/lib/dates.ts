import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export const TIME_ZONE = "Asia/Jerusalem";
export const MIN_EXPENSE_DATE = "2000-01-01";

// Today's calendar date in Israel as YYYY-MM-DD, independent of the device time zone.
export function todayIsrael(at: Date): string {
  return format(new TZDate(at.getTime(), TIME_ZONE), "yyyy-MM-dd");
}

function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function toIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return !!m && isRealDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

// "2024-08-12" -> "12.08.2024"
export function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

// "12.08.2024" (or "12/8/2024") -> "2024-08-12"; null when not a real date.
export function parseDisplayDate(text: string): string | null {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isRealDate(year, month, day) ? toIso(year, month, day) : null;
}
