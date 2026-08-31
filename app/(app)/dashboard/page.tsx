import { requireAppContext } from "@/server/services/authorization";
import { getDashboardData } from "@/server/services/dashboard";
import { todayInZone } from "@/lib/datetime";
import { StatCard, OccupancyCard } from "@/features/dashboard/stat-card";
import { UpcomingReservations } from "@/features/dashboard/upcoming-reservations";

export default async function DashboardPage() {
  const { currentLocation } = await requireAppContext();
  const today = todayInZone(currentLocation.timezone);
  const { coverage, upcoming } = await getDashboardData(currentLocation.id, today);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{currentLocation.name} — aujourd&apos;hui</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Réservations" value={String(coverage.totalReservations)} />
        <StatCard title="Couverts" value={String(coverage.totalCovers)} />
        <StatCard
          title="Service midi"
          value={`${coverage.lunch.covers} / ${coverage.lunch.capacity}`}
          subvalue="couverts"
        />
        <StatCard
          title="Service soir"
          value={`${coverage.dinner.covers} / ${coverage.dinner.capacity}`}
          subvalue="couverts"
        />
        <OccupancyCard percent={coverage.occupancyPercent} />
      </div>

      <UpcomingReservations reservations={upcoming} timezone={currentLocation.timezone} />
    </div>
  );
}
