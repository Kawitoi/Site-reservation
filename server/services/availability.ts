import {
  addMinutes,
  minutesToTime,
  timeToMinutes,
  zonedDateTimeToUtc,
  getZonedParts,
  todayInZone,
  addDaysToDateString,
} from "@/lib/datetime";

/**
 * The single source of truth for reservation availability (spec section
 * 117: "une seule source de vérité" shared by the public booking form, the
 * dashboard, manual reservation creation and the floor plan). Every
 * function here is pure — no Prisma calls — so it is directly unit
 * testable and so the same logic can never drift between call sites.
 */

export type TableInfo = { id: string; seats: number; name: string };

export type ExistingReservation = {
  id: string;
  tableId: string | null;
  startAt: Date;
  endAt: Date;
};

export type SpecialClosureWindow = { startAt: Date; endAt: Date };

export type ServiceName = "lunch" | "dinner";

export type WeeklyScheduleValue = { lunch: boolean; dinner: boolean };
export type WeeklySchedule = Record<string, WeeklyScheduleValue>;

export type RestaurantScheduleConfig = {
  weeklySchedule: WeeklySchedule;
  lunchOpensAt: string | null;
  lunchClosesAt: string | null;
  dinnerOpensAt: string | null;
  dinnerClosesAt: string | null;
  bookingIntervalMinutes: number;
  defaultReservationDurationMinutes: number;
  minimumBookingNoticeMinutes: number;
  maxBookingDaysAhead: number;
  maxPartySize: number;
};

/** Two half-open intervals [start, end) overlap iff startA < endB && startB < endA (spec section 37). */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function isTableFree(
  table: TableInfo,
  reservations: ExistingReservation[],
  startAt: Date,
  endAt: Date,
  excludeReservationId?: string
): boolean {
  return !reservations.some(
    (r) =>
      r.tableId === table.id &&
      r.id !== excludeReservationId &&
      intervalsOverlap(r.startAt, r.endAt, startAt, endAt)
  );
}

/** Smallest free table that fits the party (spec section 40 / 51). */
export function suggestTable(
  tables: TableInfo[],
  reservations: ExistingReservation[],
  partySize: number,
  startAt: Date,
  endAt: Date,
  excludeReservationId?: string
): TableInfo | null {
  const candidates = tables
    .filter((t) => t.seats >= partySize)
    .filter((t) => isTableFree(t, reservations, startAt, endAt, excludeReservationId))
    .sort((a, b) => a.seats - b.seats);
  return candidates[0] ?? null;
}

/** Weekday-of-calendar-date, timezone independent: 0 = Sunday .. 6 = Saturday. */
export function dateStringWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function getOpenWindowsForDay(
  config: RestaurantScheduleConfig,
  weekday: number
): { service: ServiceName; opensAt: string; closesAt: string }[] {
  const day = config.weeklySchedule[String(weekday)];
  const windows: { service: ServiceName; opensAt: string; closesAt: string }[] = [];
  if (day?.lunch && config.lunchOpensAt && config.lunchClosesAt) {
    windows.push({ service: "lunch", opensAt: config.lunchOpensAt, closesAt: config.lunchClosesAt });
  }
  if (day?.dinner && config.dinnerOpensAt && config.dinnerClosesAt) {
    windows.push({ service: "dinner", opensAt: config.dinnerOpensAt, closesAt: config.dinnerClosesAt });
  }
  return windows;
}

/**
 * Computes bookable time slots ("HH:mm") for one calendar date. A slot is
 * offered only if: the day/service is open, the slot respects the minimum
 * notice, the date is within the booking horizon, party size fits the
 * settings cap, no special closure covers it, and at least one table can
 * seat the party for the full duration (spec section 49).
 */
export function computeAvailableSlots(input: {
  config: RestaurantScheduleConfig;
  timezone: string;
  date: string;
  partySize: number;
  tables: TableInfo[];
  reservations: ExistingReservation[];
  closures: SpecialClosureWindow[];
  now?: Date;
}): string[] {
  const { config, timezone, date, partySize, tables, reservations, closures } = input;
  const now = input.now ?? new Date();

  if (partySize > config.maxPartySize) return [];

  const horizon = addDaysToDateString(todayInZone(timezone, now), config.maxBookingDaysAhead);
  if (date > horizon) return [];
  if (date < todayInZone(timezone, now)) return [];

  const weekday = dateStringWeekday(date);
  const windows = getOpenWindowsForDay(config, weekday);
  const noticeThreshold = addMinutes(now, config.minimumBookingNoticeMinutes);

  const slots: string[] = [];
  for (const window of windows) {
    let cursor = timeToMinutes(window.opensAt);
    const closeMinutes = timeToMinutes(window.closesAt);
    while (cursor < closeMinutes) {
      const timeStr = minutesToTime(cursor);
      const startAt = zonedDateTimeToUtc(date, timeStr, timezone);
      const endAt = addMinutes(startAt, config.defaultReservationDurationMinutes);

      if (startAt.getTime() >= noticeThreshold.getTime()) {
        const inClosure = closures.some((c) => intervalsOverlap(c.startAt, c.endAt, startAt, endAt));
        if (!inClosure) {
          const table = suggestTable(tables, reservations, partySize, startAt, endAt);
          if (table) slots.push(timeStr);
        }
      }
      cursor += config.bookingIntervalMinutes;
    }
  }

  return slots;
}

export type CoverageResult = {
  lunch: { covers: number; capacity: number };
  dinner: { covers: number; capacity: number };
  totalReservations: number;
  totalCovers: number;
  totalCapacity: number;
  occupancyPercent: number;
};

/** Dashboard KPIs: reservation count + covers for lunch/dinner + occupancy (spec section 11-12). */
export function computeCoverage(input: {
  config: RestaurantScheduleConfig;
  timezone: string;
  date: string;
  reservations: { startAt: Date; partySize: number }[];
  tables: TableInfo[];
}): CoverageResult {
  const { config, timezone, date, reservations, tables } = input;
  const weekday = dateStringWeekday(date);
  const windows = getOpenWindowsForDay(config, weekday);
  const lunchWindow = windows.find((w) => w.service === "lunch");
  const dinnerWindow = windows.find((w) => w.service === "dinner");
  const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0);

  let lunchCovers = 0;
  let dinnerCovers = 0;

  for (const reservation of reservations) {
    const { date: resDate, time } = getZonedParts(reservation.startAt, timezone);
    if (resDate !== date) continue;
    const minutes = timeToMinutes(time);
    if (lunchWindow && minutes >= timeToMinutes(lunchWindow.opensAt) && minutes < timeToMinutes(lunchWindow.closesAt)) {
      lunchCovers += reservation.partySize;
    }
    if (dinnerWindow && minutes >= timeToMinutes(dinnerWindow.opensAt) && minutes < timeToMinutes(dinnerWindow.closesAt)) {
      dinnerCovers += reservation.partySize;
    }
  }

  const lunchCapacity = lunchWindow ? totalSeats : 0;
  const dinnerCapacity = dinnerWindow ? totalSeats : 0;
  const totalCapacity = lunchCapacity + dinnerCapacity;
  const totalCovers = lunchCovers + dinnerCovers;

  return {
    lunch: { covers: lunchCovers, capacity: lunchCapacity },
    dinner: { covers: dinnerCovers, capacity: dinnerCapacity },
    totalReservations: reservations.filter((r) => getZonedParts(r.startAt, timezone).date === date).length,
    totalCovers,
    totalCapacity,
    occupancyPercent: totalCapacity > 0 ? Math.round((totalCovers / totalCapacity) * 100) : 0,
  };
}
