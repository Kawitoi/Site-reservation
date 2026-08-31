"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateCustomerAction } from "@/server/actions/customers";

export function CustomerEditForm({
  customer,
}: {
  customer: { id: string; name: string; phone: string | null; email: string | null; notes: string | null };
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    notes: customer.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await updateCustomerAction({ id: customer.id, ...values });

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    toast.success("Client mis à jour.");
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
          <Field label="Nom" htmlFor="c-name" required>
            <Input
              id="c-name"
              required
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Téléphone" htmlFor="c-phone">
              <Input
                id="c-phone"
                value={values.phone}
                onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              />
            </Field>
            <Field label="Email" htmlFor="c-email">
              <Input
                id="c-email"
                type="email"
                value={values.email}
                onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Notes internes" htmlFor="c-notes">
            <Textarea
              id="c-notes"
              value={values.notes}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            />
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
