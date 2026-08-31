import { db } from "@/lib/db";
import { zonedDateTimeToUtc } from "@/lib/datetime";

export type TableStatus = {
  tableId: string;
  occupied: boolean;
  reservation: { id: string; customerName: string; partySize: number; startTime: string; endTime: string } | null;
};

/**
 * Operation-mode snapshot (spec sections 31-33): for a given date+time,
 * which tables are occupied and by whom. A table is occupied when a
 * CONFIRMED reservation's [startAt, endAt) window contains the requested
 * instant — the same overlap semantics as the availability engine.
 */
export async function getTableStatuses(input: {
  locationId: string;
  timezone: string;
  date: string;
  time: string;
}): Promise<TableStatus[]> {
  const instant = zonedDateTimeToUtc(input.date, input.time, input.timezone);

  const [tables, reservations] = await Promise.all([
    db.table.findMany({ where: { locationId: input.locationId }, orderBy: { name: "asc" } }),
    db.reservation.findMany({
      where: {
        locationId: input.locationId,
        status: "CONFIRMED",
        tableId: { not: null },
        startAt: { lte: instant },
        endAt: { gt: instant },
      },
      select: { id: true, tableId: true, customerName: true, partySize: true, startAt: true, endAt: true },
    }),
  ]);

  const byTable = new Map(reservations.map((r) => [r.tableId as string, r]));

  return tables.map((table) => {
    const reservation = byTable.get(table.id);
    if (!reservation) return { tableId: table.id, occupied: false, reservation: null };
    return {
      tableId: table.id,
      occupied: true,
      reservation: {
        id: reservation.id,
        customerName: reservation.customerName,
        partySize: reservation.partySize,
        startTime: new Intl.DateTimeFormat("fr-FR", { timeZone: input.timezone, timeStyle: "short" }).format(
          reservation.startAt
        ),
        endTime: new Intl.DateTimeFormat("fr-FR", { timeZone: input.timezone, timeStyle: "short" }).format(
          reservation.endAt
        ),
      },
    };
  });
}
