"use client";

import { useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCE_LABELS } from "@/lib/labels";
import { createReservationAction, updateReservationAction } from "@/server/actions/reservations";
import { getZonedParts } from "@/lib/datetime";

export type ReservationFormValues = {
  id?: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  partySize: string;
  tableId: string;
  source: string;
  notes: string;
};

const emptyValues = (defaultDate: string): ReservationFormValues => ({
  date: defaultDate,
  time: "19:00",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  partySize: "2",
  tableId: "",
  source: "MANUAL",
  notes: "",
});

export function reservationToFormValues(
  reservation: {
    id: string;
    startAt: Date;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    partySize: number;
    tableId: string | null;
    source: string;
    notes: string | null;
  },
  timezone: string
): ReservationFormValues {
  const { date, time } = getZonedParts(reservation.startAt, timezone);
  return {
    id: reservation.id,
    date,
    time,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone ?? "",
    customerEmail: reservation.customerEmail ?? "",
    partySize: String(reservation.partySize),
    tableId: reservation.tableId ?? "",
    source: reservation.source,
    notes: reservation.notes ?? "",
  };
}

export function ReservationFormDialog({
  open,
  onOpenChange,
  initialValues,
  defaultDate,
  tables,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: ReservationFormValues;
  defaultDate: string;
  tables: { id: string; name: string; seats: number }[];
}) {
  const isEditMode = Boolean(initialValues?.id);
  // Shared with the (re-mounted-per-open) form body so the dialog can
  // refuse to close via outside-click/Escape while a submit is in flight.
  const submittingRef = useRef(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && submittingRef.current) return;
        onOpenChange(next);
      }}
    >
      <DialogContent title={isEditMode ? "Modifier la réservation" : "Nouvelle réservation"}>
        {open && (
          // Keying by the edited reservation (or "create") forces a fresh
          // mount — and therefore fresh local state — every time the dialog
          // opens, instead of resetting state from an effect.
          <ReservationFormBody
            key={initialValues?.id ?? "create"}
            isEditMode={isEditMode}
            initialValues={initialValues}
            defaultDate={defaultDate}
            tables={tables}
            onOpenChange={onOpenChange}
            submittingRef={submittingRef}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReservationFormBody({
  isEditMode,
  initialValues,
  defaultDate,
  tables,
  onOpenChange,
  submittingRef,
}: {
  isEditMode: boolean;
  initialValues?: ReservationFormValues;
  defaultDate: string;
  tables: { id: string; name: string; seats: number }[];
  onOpenChange: (open: boolean) => void;
  submittingRef: RefObject<boolean>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ReservationFormValues>(() => initialValues ?? emptyValues(defaultDate));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  function update<K extends keyof ReservationFormValues>(key: K, value: ReservationFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const partySizeNumber = Number(values.partySize) || 0;
  const suitableTables = tables.filter((t) => t.seats >= partySizeNumber);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Belt-and-suspenders double-submit guard (spec section 83/135): the
    // button is already disabled while `submitting`, this also blocks a
    // second synchronous submit event fired before React re-renders.
    if (submittedRef.current || submitting) return;
    submittedRef.current = true;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const payload = {
      id: values.id,
      locationId: "",
      date: values.date,
      time: values.time,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      customerEmail: values.customerEmail,
      partySize: Number(values.partySize),
      tableId: values.tableId,
      source: values.source,
      notes: values.notes,
    };

    const result = isEditMode
      ? await updateReservationAction(payload)
      : await createReservationAction(payload);

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      submittedRef.current = false;
      submittingRef.current = false;
      return;
    }

    toast.success(isEditMode ? "Réservation modifiée." : "Réservation créée.");
    if (!values.tableId && !result.data.tableAssigned && tables.length > 0) {
      toast.warning("Aucune table disponible n'a été assignée automatiquement. Assignez-en une manuellement si besoin.");
    }
    setSubmitting(false);
    submittingRef.current = false;
    onOpenChange(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" htmlFor="res-date" required>
          <Input
            id="res-date"
            type="date"
            required
            value={values.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </Field>
        <Field label="Heure" htmlFor="res-time" required>
          <Input
            id="res-time"
            type="time"
            required
            value={values.time}
            onChange={(e) => update("time", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Nom client" htmlFor="res-name" required>
        <Input
          id="res-name"
          required
          value={values.customerName}
          onChange={(e) => update("customerName", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Téléphone" htmlFor="res-phone">
          <Input id="res-phone" value={values.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="res-email">
          <Input
            id="res-email"
            type="email"
            value={values.customerEmail}
            onChange={(e) => update("customerEmail", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre de personnes" htmlFor="res-party" required>
          <Input
            id="res-party"
            type="number"
            min={1}
            required
            value={values.partySize}
            onChange={(e) => update("partySize", e.target.value)}
          />
        </Field>
        <Field label="Table" htmlFor="res-table">
          <Select value={values.tableId || "auto"} onValueChange={(v) => update("tableId", v === "auto" ? "" : v)}>
            <SelectTrigger id="res-table">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Suggestion automatique</SelectItem>
              {suitableTables.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.seats} places)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suitableTables.length === 0 && partySizeNumber > 0 && (
            <p className="text-xs text-warning">Aucune table n&apos;a assez de places pour ce groupe.</p>
          )}
        </Field>
      </div>

      <Field label="Source" htmlFor="res-source">
        <Select value={values.source} onValueChange={(v) => update("source", v)}>
          <SelectTrigger id="res-source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Notes" htmlFor="res-notes">
        <Textarea id="res-notes" value={values.notes} onChange={(e) => update("notes", e.target.value)} />
      </Field>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" loading={submitting}>
          Enregistrer
        </Button>
      </DialogFooter>
    </form>
  );
}
