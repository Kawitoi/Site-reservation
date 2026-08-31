"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { createLocationAction } from "@/server/actions/settings";
import { setCurrentLocation } from "@/server/actions/location";

export function LocationsPanel({
  locations,
  currentLocationId,
  canAddLocation,
}: {
  locations: { id: string; name: string; city: string | null }[];
  currentLocationId: string;
  canAddLocation: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleSwitch(id: string) {
    await setCurrentLocation(id);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Établissements</CardTitle>
        {canAddLocation && (
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Ajouter un établissement
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {locations.map((location) => (
            <li key={location.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {location.name}
                {location.city ? ` — ${location.city}` : ""}
              </span>
              {location.id === currentLocationId ? (
                <span className="text-xs font-medium text-accent">Sélectionné</span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => handleSwitch(location.id)}>
                  Sélectionner
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      <AddLocationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}

function AddLocationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Ajouter un établissement">
        {open && <AddLocationForm onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function AddLocationForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", phone: "", address: "", city: "", country: "France", timezone: "Europe/Paris" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await createLocationAction(values);

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    toast.success("Établissement créé.");
    setSubmitting(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Nom" htmlFor="nl-name" required>
        <Input
          id="nl-name"
          required
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </Field>
      <Field label="Téléphone" htmlFor="nl-phone">
        <Input id="nl-phone" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
      </Field>
      <Field label="Adresse" htmlFor="nl-address">
        <Input
          id="nl-address"
          value={values.address}
          onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ville" htmlFor="nl-city">
          <Input id="nl-city" value={values.city} onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))} />
        </Field>
        <Field label="Fuseau horaire" htmlFor="nl-tz" required>
          <Input
            id="nl-tz"
            required
            value={values.timezone}
            onChange={(e) => setValues((v) => ({ ...v, timezone: e.target.value }))}
          />
        </Field>
      </div>

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
          Créer
        </Button>
      </DialogFooter>
    </form>
  );
}
