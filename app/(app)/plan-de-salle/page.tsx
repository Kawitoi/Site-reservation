import { requireAppContext } from "@/server/services/authorization";
import { db } from "@/lib/db";
import { todayInZone } from "@/lib/datetime";
import { FloorPlanCanvas } from "@/features/floor-plan/floor-plan-canvas";

export default async function FloorPlanPage() {
  const { currentLocation } = await requireAppContext();

  const tables = await db.table.findMany({
    where: { locationId: currentLocation.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Plan de salle</h1>
        <p className="text-sm text-muted-foreground">{currentLocation.name}</p>
      </div>

      <FloorPlanCanvas tables={tables} defaultDate={todayInZone(currentLocation.timezone)} />
    </div>
  );
}
