"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SOURCE_LABELS } from "@/lib/labels";
import { formatTimeLabel } from "@/lib/datetime";
import {
  ReservationFormDialog,
  reservationToFormValues,
  type ReservationFormValues,
} from "@/features/reservations/reservation-form-dialog";
import { DeleteReservationButton } from "@/features/reservations/delete-reservation-button";

type ReservationRow = {
  id: string;
  startAt: Date;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  partySize: number;
  source: string;
  notes: string | null;
  table: { id: string; name: string } | null;
  tableId: string | null;
};

export function ReservationsTable({
  reservations,
  tables,
  timezone,
  defaultDate,
  page,
  totalPages,
}: {
  reservations: ReservationRow[];
  tables: { id: string; name: string; seats: number }[];
  timezone: string;
  defaultDate: string;
  page: number;
  totalPages: number;
}) {
  const searchParams = useSearchParams();
  // Lazy initializer instead of a mount effect: opens the create dialog
  // immediately when arriving via `?new=1` (e.g. from the dashboard empty
  // state) without an extra render pass.
  const [dialogOpen, setDialogOpen] = useState(() => searchParams.get("new") === "1");
  const [editing, setEditing] = useState<ReservationFormValues | undefined>(undefined);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(reservation: ReservationRow) {
    setEditing(
      reservationToFormValues(
        {
          id: reservation.id,
          startAt: reservation.startAt,
          customerName: reservation.customerName,
          customerPhone: reservation.customerPhone,
          customerEmail: reservation.customerEmail,
          partySize: reservation.partySize,
          tableId: reservation.tableId,
          source: reservation.source,
          notes: reservation.notes,
        },
        timezone
      )
    );
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouvelle réservation
          </Button>
        </div>

        {reservations.length === 0 ? (
          <EmptyState
            title="Aucune réservation."
            action={
              <Button size="sm" onClick={openCreate}>
                Créer une réservation
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Heure</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">Téléphone</th>
                  <th className="py-2 pr-4 font-medium">Personnes</th>
                  <th className="py-2 pr-4 font-medium">Table</th>
                  <th className="py-2 pr-4 font-medium">Source</th>
                  <th className="py-2 pr-4 font-medium">Notes</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">{new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, dateStyle: "short" }).format(r.startAt)}</td>
                    <td className="py-2 pr-4 font-medium text-foreground">{formatTimeLabel(r.startAt, timezone)}</td>
                    <td className="py-2 pr-4">{r.customerName}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.customerPhone ?? "—"}</td>
                    <td className="py-2 pr-4">{r.partySize}</td>
                    <td className="py-2 pr-4">{r.table?.name ?? "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{SOURCE_LABELS[r.source] ?? r.source}</td>
                    <td className="max-w-40 truncate py-2 pr-4 text-muted-foreground">{r.notes ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteReservationButton id={r.id} label={r.customerName} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} />
        </div>
      </CardContent>

      <ReservationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValues={editing}
        defaultDate={defaultDate}
        tables={tables}
      />
    </Card>
  );
}
