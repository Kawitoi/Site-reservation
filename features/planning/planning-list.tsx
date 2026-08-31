"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

export function PlanningList({
  reservations,
  tables,
  timezone,
  date,
}: {
  reservations: ReservationRow[];
  tables: { id: string; name: string; seats: number }[];
  timezone: string;
  date: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
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
            title="Aucune réservation ce jour-là."
            action={
              <Button size="sm" onClick={openCreate}>
                Créer une réservation
              </Button>
            }
          />
        ) : (
          <ol className="flex flex-col divide-y divide-border">
            {reservations.map((r) => (
              <li key={r.id} className="flex items-center gap-4 py-3">
                <span className="w-14 shrink-0 font-semibold text-foreground">{formatTimeLabel(r.startAt, timezone)}</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{r.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.partySize} pers. · {r.table?.name ?? "Sans table"} ·{" "}
                    {SOURCE_LABELS[r.source] ?? r.source}
                    {r.customerPhone ? ` · ${r.customerPhone}` : ""}
                  </p>
                  {r.notes && <p className="mt-0.5 text-xs text-muted-foreground italic">{r.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DeleteReservationButton id={r.id} label={r.customerName} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      <ReservationFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initialValues={editing} defaultDate={date} tables={tables} />
    </Card>
  );
}
