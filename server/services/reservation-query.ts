import { db } from "@/lib/db";
import { zonedDateTimeToUtc, addDaysToDateString } from "@/lib/datetime";
import type { ReservationSource } from "@/lib/generated/prisma/client";

export type ReservationListParams = {
  locationId: string;
  timezone: string;
  page: number;
  pageSize: number;
  search?: string;
  date?: string;
  source?: ReservationSource;
};

/** Server-side paginated + filtered reservation list — spec sections 20-21 (never load everything into the browser). */
export async function listReservations(params: ReservationListParams) {
  const { locationId, timezone, page, pageSize, search, date, source } = params;

  const where = {
    locationId,
    status: "CONFIRMED" as const,
    ...(source ? { source } : {}),
    ...(date
      ? {
          startAt: {
            gte: zonedDateTimeToUtc(date, "00:00", timezone),
            lt: zonedDateTimeToUtc(addDaysToDateString(date, 1), "00:00", timezone),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { customerName: { contains: search, mode: "insensitive" as const } },
            { customerPhone: { contains: search } },
            { customerEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, reservations] = await Promise.all([
    db.reservation.count({ where }),
    db.reservation.findMany({
      where,
      orderBy: { startAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { table: { select: { id: true, name: true } } },
    }),
  ]);

  return { reservations, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getReservationTables(locationId: string) {
  return db.table.findMany({ where: { locationId }, orderBy: { seats: "asc" } });
}
