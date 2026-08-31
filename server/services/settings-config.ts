import type { RestaurantSettings } from "@/lib/generated/prisma/client";
import type { RestaurantScheduleConfig, WeeklySchedule } from "@/server/services/availability";
import { weeklyScheduleSchema } from "@/server/validation/settings";

const FALLBACK_SCHEDULE: WeeklySchedule = {
  "0": { lunch: true, dinner: true },
  "1": { lunch: true, dinner: true },
  "2": { lunch: true, dinner: true },
  "3": { lunch: true, dinner: true },
  "4": { lunch: true, dinner: true },
  "5": { lunch: true, dinner: true },
  "6": { lunch: true, dinner: true },
};

export function parseWeeklySchedule(value: unknown): WeeklySchedule {
  const result = weeklyScheduleSchema.safeParse(value);
  return result.success ? result.data : FALLBACK_SCHEDULE;
}

/** Adapts a Prisma RestaurantSettings row (raw Json field) into the typed shape the availability engine expects. */
export function toScheduleConfig(settings: RestaurantSettings): RestaurantScheduleConfig {
  return {
    weeklySchedule: parseWeeklySchedule(settings.weeklySchedule),
    lunchOpensAt: settings.lunchOpensAt,
    lunchClosesAt: settings.lunchClosesAt,
    dinnerOpensAt: settings.dinnerOpensAt,
    dinnerClosesAt: settings.dinnerClosesAt,
    bookingIntervalMinutes: settings.bookingIntervalMinutes,
    defaultReservationDurationMinutes: settings.defaultReservationDurationMinutes,
    minimumBookingNoticeMinutes: settings.minimumBookingNoticeMinutes,
    maxBookingDaysAhead: settings.maxBookingDaysAhead,
    maxPartySize: settings.maxPartySize,
  };
}
