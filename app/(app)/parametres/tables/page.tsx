import Link from "next/link";
import { requireAppContext } from "@/server/services/authorization";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SHAPE_LABELS } from "@/lib/labels";

export default async function TablesSettingsPage() {
  const { currentLocation } = await requireAppContext();
  const tables = await db.table.findMany({ where: { locationId: currentLocation.id }, orderBy: { name: "asc" } });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Tables</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/plan-de-salle">Modifier le plan de salle</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tables.length === 0 ? (
          <EmptyState
            title="Aucune table configurée."
            action={
              <Button asChild size="sm">
                <Link href="/plan-de-salle">Ajouter des tables</Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {tables.map((table) => (
              <li key={table.id} className="flex items-center justify-between py-2 text-sm">
                <span>{table.name}</span>
                <span className="text-muted-foreground">
                  {table.seats} places · {SHAPE_LABELS[table.shape] ?? table.shape}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
