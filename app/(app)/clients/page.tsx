import Link from "next/link";
import { Suspense } from "react";
import { requireAppContext } from "@/server/services/authorization";
import { listCustomers } from "@/server/services/customer-query";
import { listCustomersQuerySchema } from "@/server/validation/customer";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ClientsSearch } from "@/features/clients/clients-search";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organization, currentLocation } = await requireAppContext();
  const raw = await searchParams;
  const parsed = listCustomersQuerySchema.safeParse({ page: raw.page, search: raw.search });
  const query = parsed.success ? parsed.data : { page: 1, pageSize: 25 as const, search: undefined };

  const { customers, total, totalPages } = await listCustomers({
    organizationId: organization.id,
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Clients</h1>
        <p className="text-sm text-muted-foreground">{total} client(s)</p>
      </div>

      <Suspense fallback={null}>
        <ClientsSearch />
      </Suspense>

      <Card>
        <CardContent className="pt-5">
          {customers.length === 0 ? (
            <EmptyState title="Aucun client pour le moment." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Nom</th>
                    <th className="py-2 pr-4 font-medium">Téléphone</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Réservations</th>
                    <th className="py-2 pr-4 font-medium">Dernière réservation</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4">
                        <Link href={`/clients/${c.id}`} className="font-medium text-accent hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{c.phone ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{c.email ?? "—"}</td>
                      <td className="py-2 pr-4">{c._count.reservations}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {c.reservations[0]
                          ? new Intl.DateTimeFormat("fr-FR", {
                              timeZone: currentLocation.timezone,
                              dateStyle: "short",
                            }).format(c.reservations[0].startAt)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4">
            <Suspense fallback={null}>
              <Pagination page={query.page} totalPages={totalPages} />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
