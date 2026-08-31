import { notFound } from "next/navigation";
import { requireAppContext } from "@/server/services/authorization";
import { getCustomerDetail } from "@/server/services/customer-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerEditForm } from "@/features/clients/customer-edit-form";
import { CustomerDangerActions } from "@/features/clients/customer-danger-actions";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireAppContext();
  const detail = await getCustomerDetail(id, organization.id);

  if (!detail) notFound();
  const { customer, reservations } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">{reservations.length} réservation(s)</p>
        </div>
        <CustomerDangerActions id={customer.id} name={customer.name} />
      </div>

      <CustomerEditForm customer={customer} />

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <EmptyState title="Aucune réservation pour ce client." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Heure</th>
                    <th className="py-2 pr-4 font-medium">Établissement</th>
                    <th className="py-2 pr-4 font-medium">Personnes</th>
                    <th className="py-2 pr-4 font-medium">Table</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4">
                        {new Intl.DateTimeFormat("fr-FR", { timeZone: r.location.timezone, dateStyle: "short" }).format(
                          r.startAt
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {new Intl.DateTimeFormat("fr-FR", { timeZone: r.location.timezone, timeStyle: "short" }).format(
                          r.startAt
                        )}
                      </td>
                      <td className="py-2 pr-4">{r.location.name}</td>
                      <td className="py-2 pr-4">{r.partySize}</td>
                      <td className="py-2 pr-4">{r.table?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
