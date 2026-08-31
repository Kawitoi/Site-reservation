"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEEKDAY_LABELS } from "@/lib/labels";
import { updateServicesSettingsAction } from "@/server/actions/settings";
import type { WeeklySchedule } from "@/server/services/availability";

export function ServicesSettingsForm({
  settings,
}: {
  settings: {
    lunchOpensAt: string | null;
    lunchClosesAt: string | null;
    dinnerOpensAt: string | null;
    dinnerClosesAt: string | null;
    weeklySchedule: WeeklySchedule;
  };
}) {
  const router = useRouter();
  const [hours, setHours] = useState({
    lunchOpensAt: settings.lunchOpensAt ?? "12:00",
    lunchClosesAt: settings.lunchClosesAt ?? "14:30",
    dinnerOpensAt: settings.dinnerOpensAt ?? "19:00",
    dinnerClosesAt: settings.dinnerClosesAt ?? "22:30",
  });
  const [schedule, setSchedule] = useState<WeeklySchedule>(settings.weeklySchedule);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: string, service: "lunch" | "dinner") {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [service]: !prev[day][service] },
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await updateServicesSettingsAction({ ...hours, weeklySchedule: schedule });

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
        <CardTitle>Services</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Midi</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ouverture" htmlFor="sv-lunch-open">
                  <Input
                    id="sv-lunch-open"
                    type="time"
                    value={hours.lunchOpensAt}
                    onChange={(e) => setHours((h) => ({ ...h, lunchOpensAt: e.target.value }))}
                  />
                </Field>
                <Field label="Fermeture" htmlFor="sv-lunch-close">
                  <Input
                    id="sv-lunch-close"
                    type="time"
                    value={hours.lunchClosesAt}
                    onChange={(e) => setHours((h) => ({ ...h, lunchClosesAt: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Soir</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ouverture" htmlFor="sv-dinner-open">
                  <Input
                    id="sv-dinner-open"
                    type="time"
                    value={hours.dinnerOpensAt}
                    onChange={(e) => setHours((h) => ({ ...h, dinnerOpensAt: e.target.value }))}
                  />
                </Field>
                <Field label="Fermeture" htmlFor="sv-dinner-close">
                  <Input
                    id="sv-dinner-close"
                    type="time"
                    value={hours.dinnerClosesAt}
                    onChange={(e) => setHours((h) => ({ ...h, dinnerClosesAt: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Jours d&apos;ouverture</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-1 pr-4 font-medium">Jour</th>
                    <th className="py-1 pr-4 font-medium">Midi</th>
                    <th className="py-1 pr-4 font-medium">Soir</th>
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <tr key={label} className="border-t border-border">
                      <td className="py-2 pr-4">{label}</td>
                      <td className="py-2 pr-4">
                        <input
                          type="checkbox"
                          aria-label={`${label} midi`}
                          checked={schedule[String(index)]?.lunch ?? false}
                          onChange={() => toggleDay(String(index), "lunch")}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="checkbox"
                          aria-label={`${label} soir`}
                          checked={schedule[String(index)]?.dinner ?? false}
                          onChange={() => toggleDay(String(index), "dinner")}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
