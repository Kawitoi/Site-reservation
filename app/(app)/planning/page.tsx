import { requireAppContext } from "@/server/services/authorization";
import { listReservations, getReservationTables } from "@/server/services/reservation-query";
import { todayInZone, isValidDateString } from "@/lib/datetime";
import { DayNavigator } from "@/features/planning/day-navigator";
import { PlanningList } from "@/features/planning/planning-list";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { currentLocation } = await requireAppContext();
  const raw = await searchParams;
  const rawDate = typeof raw.date === "string" ? raw.date : undefined;
  const date = rawDate && isValidDateString(rawDate) ? rawDate : todayInZone(currentLocation.timezone);

  const [{ reservations }, tables] = await Promise.all([
    listReservations({
      locationId: currentLocation.id,
      timezone: currentLocation.timezone,
      page: 1,
      pageSize: 500,
      date,
    }),
    getReservationTables(currentLocation.id),
  ]);

  const sorted = [...reservations].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Planning</h1>
          <p className="text-sm text-muted-foreground">{currentLocation.name}</p>
        </div>
        <DayNavigator date={date} timezone={currentLocation.timezone} />
      </div>

      <PlanningList reservations={sorted} tables={tables} timezone={currentLocation.timezone} date={date} />
    </div>
  );
}
