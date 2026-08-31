import { Suspense } from "react";
import { requireAppContext } from "@/server/services/authorization";
import { listReservations, getReservationTables } from "@/server/services/reservation-query";
import { listReservationsQuerySchema } from "@/server/validation/reservation";
import { todayInZone } from "@/lib/datetime";
import { ReservationsFilters } from "@/features/reservations/reservations-filters";
import { ReservationsTable } from "@/features/reservations/reservations-table";
import type { ReservationSource } from "@/lib/generated/prisma/client";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { currentLocation } = await requireAppContext();
  const raw = await searchParams;

  const parsed = listReservationsQuerySchema.safeParse({
    locationId: currentLocation.id,
    page: raw.page,
    search: raw.search,
    date: raw.date,
    source: raw.source,
  });

  const query = parsed.success
    ? parsed.data
    : { locationId: currentLocation.id, page: 1, pageSize: 25 as const };

  const [{ reservations, total, totalPages }, tables] = await Promise.all([
    listReservations({
      locationId: currentLocation.id,
      timezone: currentLocation.timezone,
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      date: query.date,
      source: query.source as ReservationSource | undefined,
    }),
    getReservationTables(currentLocation.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Réservations</h1>
        <p className="text-sm text-muted-foreground">{total} réservation(s)</p>
      </div>

      <Suspense fallback={null}>
        <ReservationsFilters />
      </Suspense>

      <Suspense fallback={null}>
        <ReservationsTable
          reservations={reservations}
          tables={tables}
          timezone={currentLocation.timezone}
          defaultDate={todayInZone(currentLocation.timezone)}
          page={query.page}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}
