import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Single source of truth for date/time handling across TableFlow.
 *
 * Rule: Reservation.startAt / endAt are always stored as UTC instants in
 * PostgreSQL. Every wall-clock date/time a restaurateur or a public visitor
 * types in is local to the RestaurantLocation's timezone and MUST go
 * through `zonedDateTimeToUtc` before being persisted. Every UTC instant
 * read back out MUST go through `formatDateInZone` / `formatTimeInZone` /
 * `getZonedParts` before being shown or compared against opening hours —
 * see spec section 121.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function zonedDateTimeToUtc(date: string, time: string, timezone: string): Date {
  if (!DATE_RE.test(date)) throw new Error(`Invalid date: ${date}`);
  if (!TIME_RE.test(time)) throw new Error(`Invalid time: ${time}`);
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Day of week in the given timezone: 0 = Sunday .. 6 = Saturday. */
export function getZonedDayOfWeek(instant: Date, timezone: string): number {
  return toZonedTime(instant, timezone).getDay();
}

export function getZonedParts(instant: Date, timezone: string): { date: string; time: string } {
  return {
    date: formatInTimeZone(instant, timezone, "yyyy-MM-dd"),
    time: formatInTimeZone(instant, timezone, "HH:mm"),
  };
}

export function formatDateLabel(instant: Date, timezone: string): string {
  return formatInTimeZone(instant, timezone, "EEEE d MMMM yyyy", { locale: undefined });
}

export function formatTimeLabel(instant: Date, timezone: string): string {
  return formatInTimeZone(instant, timezone, "HH:mm");
}

/** "today" in the given timezone, as a "YYYY-MM-DD" string. */
export function todayInZone(timezone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

export function isValidDateString(value: string): boolean {
  return DATE_RE.test(value);
}

export function isValidTimeString(value: string): boolean {
  return TIME_RE.test(value);
}

/** Adds `days` calendar days to a "YYYY-MM-DD" string, timezone-naively (safe: pure calendar math). */
export function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
