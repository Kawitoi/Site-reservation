import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SOURCE_LABELS } from "@/lib/labels";
import { formatTimeLabel } from "@/lib/datetime";

type ReservationRow = {
  id: string;
  startAt: Date;
  customerName: string;
  partySize: number;
  source: string;
  table: { name: string } | null;
};

export function UpcomingReservations({
  reservations,
  timezone,
}: {
  reservations: ReservationRow[];
  timezone: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Prochaines réservations</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/reservations">Voir toutes les réservations</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <EmptyState
            title="Aucune réservation aujourd'hui."
            action={
              <Button asChild size="sm">
                <Link href="/reservations?new=1">Créer une réservation</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Heure</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">Personnes</th>
                  <th className="py-2 pr-4 font-medium">Table</th>
                  <th className="py-2 pr-4 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground">{formatTimeLabel(r.startAt, timezone)}</td>
                    <td className="py-2 pr-4">{r.customerName}</td>
                    <td className="py-2 pr-4">{r.partySize}</td>
                    <td className="py-2 pr-4">{r.table?.name ?? "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{SOURCE_LABELS[r.source] ?? r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
