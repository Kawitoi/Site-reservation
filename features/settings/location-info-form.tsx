"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLocationInfoAction } from "@/server/actions/settings";
import { TIMEZONES } from "@/lib/timezones";

export function LocationInfoForm({
  location,
}: {
  location: {
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    timezone: string;
    publicSlug: string;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: location.name,
    phone: location.phone ?? "",
    address: location.address ?? "",
    city: location.city ?? "",
    postalCode: location.postalCode ?? "",
    country: location.country ?? "",
    timezone: location.timezone,
    publicSlug: location.publicSlug,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await updateLocationInfoAction(values);

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
        <CardTitle>Informations</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Nom" htmlFor="li-name" required>
            <Input id="li-name" required value={values.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Téléphone" htmlFor="li-phone">
              <Input id="li-phone" value={values.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="Adresse publique (slug)" htmlFor="li-slug" required>
              <Input
                id="li-slug"
                required
                value={values.publicSlug}
                onChange={(e) => update("publicSlug", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">/book/{values.publicSlug || "..."}</p>
            </Field>
          </div>
          <Field label="Adresse" htmlFor="li-address">
            <Input id="li-address" value={values.address} onChange={(e) => update("address", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Ville" htmlFor="li-city">
              <Input id="li-city" value={values.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
            <Field label="Code postal" htmlFor="li-postal">
              <Input id="li-postal" value={values.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
            </Field>
            <Field label="Pays" htmlFor="li-country">
              <Input id="li-country" value={values.country} onChange={(e) => update("country", e.target.value)} />
            </Field>
          </div>
          <Field label="Fuseau horaire" htmlFor="li-timezone" required>
            <Input
              id="li-timezone"
              required
              list="timezone-options"
              value={values.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            />
            <datalist id="timezone-options">
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </Field>

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
