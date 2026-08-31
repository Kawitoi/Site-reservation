"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTableAction, updateTableAction, deleteTableAction } from "@/server/actions/tables";

export type TableFormValues = {
  id?: string;
  name: string;
  seats: string;
  shape: "RECTANGLE" | "ROUND";
  x: number;
  y: number;
  width: string;
  height: string;
};

export function TableFormDialog({
  open,
  onOpenChange,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: TableFormValues;
}) {
  const isEditMode = Boolean(initialValues?.id);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEditMode ? "Modifier la table" : "Nouvelle table"}>
        {open && (
          <TableFormBody
            key={initialValues?.id ?? "create"}
            isEditMode={isEditMode}
            initialValues={initialValues}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TableFormBody({
  isEditMode,
  initialValues,
  onOpenChange,
}: {
  isEditMode: boolean;
  initialValues?: TableFormValues;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<TableFormValues>(
    () => initialValues ?? { name: "", seats: "4", shape: "RECTANGLE", x: 40, y: 40, width: "80", height: "80" }
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      id: values.id,
      locationId: "",
      name: values.name,
      seats: Number(values.seats),
      shape: values.shape,
      x: values.x,
      y: values.y,
      width: Number(values.width),
      height: Number(values.height),
    };

    const result = isEditMode ? await updateTableAction(payload) : await createTableAction(payload);

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    toast.success(isEditMode ? "Table modifiée." : "Table créée.");
    setSubmitting(false);
    onOpenChange(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!values.id || deleting) return;
    setDeleting(true);
    const result = await deleteTableAction(values.id);
    setDeleting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Table supprimée.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Nom" htmlFor="t-name" required>
        <Input
          id="t-name"
          required
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre de places" htmlFor="t-seats" required>
          <Input
            id="t-seats"
            type="number"
            min={1}
            required
            value={values.seats}
            onChange={(e) => setValues((v) => ({ ...v, seats: e.target.value }))}
          />
        </Field>
        <Field label="Forme" htmlFor="t-shape">
          <Select value={values.shape} onValueChange={(v) => setValues((prev) => ({ ...prev, shape: v as "RECTANGLE" | "ROUND" }))}>
            <SelectTrigger id="t-shape">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RECTANGLE">Rectangle</SelectItem>
              <SelectItem value="ROUND">Rond</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter className="justify-between sm:justify-between">
        {isEditMode ? (
          <Button type="button" variant="destructive" onClick={handleDelete} loading={deleting}>
            Supprimer
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" loading={submitting}>
            Enregistrer
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
