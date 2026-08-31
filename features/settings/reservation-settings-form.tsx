"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateReservationSettingsAction } from "@/server/actions/settings";

export function ReservationSettingsForm({
  settings,
}: {
  settings: {
    defaultReservationDurationMinutes: number;
    bookingIntervalMinutes: number;
    publicBookingEnabled: boolean;
    notifyOnNewPublicBooking: boolean;
    maxPartySize: number;
    minimumBookingNoticeMinutes: number;
    maxBookingDaysAhead: number;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    defaultReservationDurationMinutes: String(settings.defaultReservationDurationMinutes),
    bookingIntervalMinutes: String(settings.bookingIntervalMinutes),
    publicBookingEnabled: settings.publicBookingEnabled,
    notifyOnNewPublicBooking: settings.notifyOnNewPublicBooking,
    maxPartySize: String(settings.maxPartySize),
    minimumBookingNoticeMinutes: String(settings.minimumBookingNoticeMinutes),
    maxBookingDaysAhead: String(settings.maxBookingDaysAhead),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await updateReservationSettingsAction({
      ...values,
      defaultReservationDurationMinutes: Number(values.defaultReservationDurationMinutes),
      bookingIntervalMinutes: Number(values.bookingIntervalMinutes),
      maxPartySize: Number(values.maxPartySize),
      minimumBookingNoticeMinutes: Number(values.minimumBookingNoticeMinutes),
      maxBookingDaysAhead: Number(values.maxBookingDaysAhead),
    });

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    toast.success("Paramètres enregistrés.");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Réservations</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Durée par défaut (minutes)" htmlFor="rs-duration" required>
              <Input
                id="rs-duration"
                type="number"
                min={15}
                required
                value={values.defaultReservationDurationMinutes}
                onChange={(e) => setValues((v) => ({ ...v, defaultReservationDurationMinutes: e.target.value }))}
              />
            </Field>
            <Field label="Intervalle des créneaux (minutes)" htmlFor="rs-interval" required>
              <Input
                id="rs-interval"
                type="number"
                min={5}
                required
                value={values.bookingIntervalMinutes}
                onChange={(e) => setValues((v) => ({ ...v, bookingIntervalMinutes: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Groupe maximum" htmlFor="rs-maxparty" required>
              <Input
                id="rs-maxparty"
                type="number"
                min={1}
                required
                value={values.maxPartySize}
                onChange={(e) => setValues((v) => ({ ...v, maxPartySize: e.target.value }))}
              />
            </Field>
            <Field label="Délai minimum (minutes)" htmlFor="rs-notice" required>
              <Input
                id="rs-notice"
                type="number"
                min={0}
                required
                value={values.minimumBookingNoticeMinutes}
                onChange={(e) => setValues((v) => ({ ...v, minimumBookingNoticeMinutes: e.target.value }))}
              />
            </Field>
            <Field label="Horizon de réservation (jours)" htmlFor="rs-horizon" required>
              <Input
                id="rs-horizon"
                type="number"
                min={1}
                required
                value={values.maxBookingDaysAhead}
                onChange={(e) => setValues((v) => ({ ...v, maxBookingDaysAhead: e.target.value }))}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.publicBookingEnabled}
              onChange={(e) => setValues((v) => ({ ...v, publicBookingEnabled: e.target.checked }))}
            />
            Réservations en ligne activées
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.notifyOnNewPublicBooking}
              onChange={(e) => setValues((v) => ({ ...v, notifyOnNewPublicBooking: e.target.checked }))}
            />
            Recevoir un email pour chaque nouvelle réservation en ligne
          </label>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} className="self-start">
            Enregistrer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
