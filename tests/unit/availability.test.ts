import { describe, it, expect } from "vitest";
import {
  intervalsOverlap,
  isTableFree,
  suggestTable,
  computeAvailableSlots,
  computeCoverage,
  dateStringWeekday,
  getOpenWindowsForDay,
  type TableInfo,
  type ExistingReservation,
  type RestaurantScheduleConfig,
} from "@/server/services/availability";

function d(iso: string): Date {
  return new Date(iso);
}

describe("intervalsOverlap (spec section 37)", () => {
  it("detects a genuine overlap", () => {
    // T1: 19:00-21:00 vs 20:00-22:00 -> overlap
    expect(intervalsOverlap(d("2026-09-15T19:00:00Z"), d("2026-09-15T21:00:00Z"), d("2026-09-15T20:00:00Z"), d("2026-09-15T22:00:00Z"))).toBe(true);
  });

  it("allows back-to-back reservations that only touch at the boundary", () => {
    // 19:00-21:00 then 21:00-23:00 must be allowed (spec section 36 example)
    expect(intervalsOverlap(d("2026-09-15T19:00:00Z"), d("2026-09-15T21:00:00Z"), d("2026-09-15T21:00:00Z"), d("2026-09-15T23:00:00Z"))).toBe(false);
  });

  it("detects one interval fully containing another", () => {
    expect(intervalsOverlap(d("2026-09-15T18:00:00Z"), d("2026-09-15T23:00:00Z"), d("2026-09-15T19:00:00Z"), d("2026-09-15T20:00:00Z"))).toBe(true);
  });

  it("does not overlap when completely separate", () => {
    expect(intervalsOverlap(d("2026-09-15T12:00:00Z"), d("2026-09-15T14:00:00Z"), d("2026-09-15T19:00:00Z"), d("2026-09-15T21:00:00Z"))).toBe(false);
  });
});

describe("isTableFree / suggestTable (spec sections 39-40, 51)", () => {
  const tables: TableInfo[] = [
    { id: "t1", name: "T1", seats: 2 },
    { id: "t8", name: "T8", seats: 8 },
    { id: "t4", name: "T4", seats: 4 },
  ];

  it("excludes a table with an overlapping reservation", () => {
    const reservations: ExistingReservation[] = [
      { id: "r1", tableId: "t1", startAt: d("2026-09-15T19:00:00Z"), endAt: d("2026-09-15T21:00:00Z") },
    ];
    expect(isTableFree(tables[0], reservations, d("2026-09-15T20:00:00Z"), d("2026-09-15T22:00:00Z"))).toBe(false);
  });

  it("a reservation never blocks itself when excluded (edit flow)", () => {
    const reservations: ExistingReservation[] = [
      { id: "r1", tableId: "t1", startAt: d("2026-09-15T19:00:00Z"), endAt: d("2026-09-15T21:00:00Z") },
    ];
    expect(isTableFree(tables[0], reservations, d("2026-09-15T19:00:00Z"), d("2026-09-15T21:00:00Z"), "r1")).toBe(true);
  });

  it("prefers the smallest table that fits the party (2 people -> T1, not T8)", () => {
    const table = suggestTable(tables, [], 2, d("2026-09-15T19:00:00Z"), d("2026-09-15T21:00:00Z"));
    expect(table?.id).toBe("t1");
  });

  it("skips tables that are too small for the party", () => {
    const table = suggestTable(tables, [], 6, d("2026-09-15T19:00:00Z"), d("2026-09-15T21:00:00Z"));
    expect(table?.id).toBe("t8");
  });

  it("returns null when no table fits, rather than picking an undersized one", () => {
    const table = suggestTable(tables, [], 20, d("2026-09-15T19:00:00Z"), d("2026-09-15T21:00:00Z"));
    expect(table).toBeNull();
  });

  it("skips an otherwise-fitting table if it's occupied at that time", () => {
    const reservations: ExistingReservation[] = [
      { id: "r1", tableId: "t4", startAt: d("2026-09-15T19:00:00Z"), endAt: d("2026-09-15T21:00:00Z") },
    ];
    const table = suggestTable(tables, reservations, 4, d("2026-09-15T19:30:00Z"), d("2026-09-15T21:30:00Z"));
    expect(table?.id).toBe("t8");
  });
});

const fullWeekOpen = {
  "0": { lunch: true, dinner: true },
  "1": { lunch: true, dinner: true },
  "2": { lunch: true, dinner: true },
  "3": { lunch: true, dinner: true },
  "4": { lunch: true, dinner: true },
  "5": { lunch: true, dinner: true },
  "6": { lunch: true, dinner: true },
};

const baseConfig: RestaurantScheduleConfig = {
  weeklySchedule: fullWeekOpen,
  lunchOpensAt: "12:00",
  lunchClosesAt: "14:30",
  dinnerOpensAt: "19:00",
  dinnerClosesAt: "22:30",
  bookingIntervalMinutes: 30,
  defaultReservationDurationMinutes: 120,
  minimumBookingNoticeMinutes: 60,
  maxBookingDaysAhead: 60,
  maxPartySize: 10,
};

describe("dateStringWeekday / getOpenWindowsForDay", () => {
  it("computes the correct weekday independent of timezone", () => {
    // 2026-09-15 is a Tuesday.
    expect(dateStringWeekday("2026-09-15")).toBe(2);
  });

  it("returns both services when both are open", () => {
    const windows = getOpenWindowsForDay(baseConfig, 2);
    expect(windows).toHaveLength(2);
    expect(windows.map((w) => w.service)).toEqual(["lunch", "dinner"]);
  });

  it("omits a service closed for that weekday", () => {
    const mondayLunchClosed: RestaurantScheduleConfig = {
      ...baseConfig,
      weeklySchedule: { ...fullWeekOpen, "1": { lunch: false, dinner: true } },
    };
    const windows = getOpenWindowsForDay(mondayLunchClosed, 1);
    expect(windows.map((w) => w.service)).toEqual(["dinner"]);
  });
});

describe("computeAvailableSlots (spec sections 47-51)", () => {
  const farFutureDate = "2026-01-15"; // within 60 days of the fixed `now` used below, well beyond any notice window

  it("produces slots at the configured interval within the service window", () => {
    const slots = computeAvailableSlots({
      config: baseConfig,
      timezone: "Europe/Paris",
      date: farFutureDate,
      partySize: 2,
      tables: [{ id: "t1", name: "T1", seats: 4 }],
      reservations: [],
      closures: [],
      now: new Date("2026-01-01T00:00:00Z"),
    });
    // Dinner 19:00-22:30 at 30-min steps: 19:00, 19:30, ..., 22:00 (7 slots) + lunch (5 slots) = 12
    expect(slots).toContain("19:00");
    expect(slots).toContain("21:30");
    expect(slots).not.toContain("22:30"); // last seating must start before closing
    expect(slots.length).toBe(12);
  });

  it("excludes a slot with no table large enough for the party", () => {
    const slots = computeAvailableSlots({
      config: baseConfig,
      timezone: "Europe/Paris",
      date: farFutureDate,
      partySize: 12,
      tables: [{ id: "t1", name: "T1", seats: 4 }],
      reservations: [],
      closures: [],
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(slots).toHaveLength(0);
  });

  it("excludes a slot covered by a special closure", () => {
    const slots = computeAvailableSlots({
      config: baseConfig,
      timezone: "Europe/Paris",
      date: farFutureDate,
      partySize: 2,
      tables: [{ id: "t1", name: "T1", seats: 4 }],
      reservations: [],
      closures: [{ startAt: new Date("2026-01-14T22:00:00Z"), endAt: new Date("2026-01-16T00:00:00Z") }],
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(slots).toHaveLength(0);
  });

  it("respects the minimum booking notice", () => {
    // "now" is 18:45 UTC (~19:45 Paris, winter time) on the target date; with
    // 60 min notice, the 19:00 slot should already be excluded.
    const slots = computeAvailableSlots({
      config: baseConfig,
      timezone: "Europe/Paris",
      date: farFutureDate,
      partySize: 2,
      tables: [{ id: "t1", name: "T1", seats: 4 }],
      reservations: [],
      closures: [],
      now: new Date("2026-01-15T18:45:00Z"),
    });
    expect(slots).not.toContain("19:00");
  });

  it("rejects a party size larger than maxPartySize outright", () => {
    const slots = computeAvailableSlots({
      config: { ...baseConfig, maxPartySize: 6 },
      timezone: "Europe/Paris",
      date: farFutureDate,
      partySize: 8,
      tables: [{ id: "t1", name: "T1", seats: 10 }],
      reservations: [],
      closures: [],
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(slots).toHaveLength(0);
  });
});

describe("computeCoverage (spec sections 11-12)", () => {
  it("splits covers between lunch and dinner and computes occupancy", () => {
    const result = computeCoverage({
      config: baseConfig,
      timezone: "Europe/Paris",
      date: "2026-09-15",
      tables: [
        { id: "t1", name: "T1", seats: 4 },
        { id: "t2", name: "T2", seats: 6 },
      ],
      reservations: [
        { startAt: new Date("2026-09-15T10:30:00Z"), partySize: 2 }, // 12:30 Paris -> lunch
        { startAt: new Date("2026-09-15T17:30:00Z"), partySize: 4 }, // 19:30 Paris -> dinner
      ],
    });
    expect(result.lunch.covers).toBe(2);
    expect(result.dinner.covers).toBe(4);
    expect(result.totalCovers).toBe(6);
    expect(result.totalCapacity).toBe(20); // (4+6) seats x 2 services
    expect(result.occupancyPercent).toBe(Math.round((6 / 20) * 100));
  });

  it("ignores reservations on a different date", () => {
    const result = computeCoverage({
      config: baseConfig,
      timezone: "Europe/Paris",
      date: "2026-09-15",
      tables: [{ id: "t1", name: "T1", seats: 4 }],
      reservations: [{ startAt: new Date("2026-09-16T17:30:00Z"), partySize: 4 }],
    });
    expect(result.totalCovers).toBe(0);
    expect(result.totalReservations).toBe(0);
  });
});
