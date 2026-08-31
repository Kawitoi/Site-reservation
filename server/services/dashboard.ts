import { db } from "@/lib/db";
import { computeCoverage } from "@/server/services/availability";
import { toScheduleConfig } from "@/server/services/settings-config";
import { zonedDateTimeToUtc, addDaysToDateString } from "@/lib/datetime";

export async function getDashboardData(locationId: string, date: string) {
  const location = await db.restaurantLocation.findUniqueOrThrow({
    where: { id: locationId },
    include: { settings: true },
  });
  if (!location.settings) throw new Error("Paramètres manquants pour cet établissement.");

  const dayStart = zonedDateTimeToUtc(date, "00:00", location.timezone);
  const dayEnd = zonedDateTimeToUtc(addDaysToDateString(date, 1), "00:00", location.timezone);

  const [tables, reservations] = await Promise.all([
    db.table.findMany({ where: { locationId }, select: { id: true, name: true, seats: true } }),
    db.reservation.findMany({
      where: { locationId, status: "CONFIRMED", startAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startAt: "asc" },
      include: { table: { select: { name: true } } },
    }),
  ]);

  const coverage = computeCoverage({
    config: toScheduleConfig(location.settings),
    timezone: location.timezone,
    date,
    reservations,
    tables,
  });

  const now = new Date();
  const upcoming = reservations.filter((r) => r.startAt >= now).slice(0, 8);
  const upcomingList = upcoming.length > 0 ? upcoming : reservations.slice(0, 8);

  return { location, coverage, reservations, upcoming: upcomingList };
}
