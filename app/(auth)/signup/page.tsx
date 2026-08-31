"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signupAccountSchema, signupRestaurantSchema } from "@/server/validation/onboarding";
import { completeSignup } from "@/server/actions/onboarding";

type FormState = {
  name: string;
  email: string;
  password: string;
  restaurantName: string;
  phone: string;
  address: string;
  capacity: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
  restaurantName: "",
  phone: "",
  address: "",
  capacity: "",
};

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goToStep2() {
    const result = signupAccountSchema.safeParse(form);
    if (!result.success) {
      setErrors(flattenErrors(result.error));
      return;
    }
    setErrors({});
    setStep(2);
  }

  function goToStep3() {
    if (!form.restaurantName.trim()) {
      setErrors({ restaurantName: "Le nom du restaurant est requis" });
      return;
    }
    setErrors({});
    setStep(3);
  }

  async function handleFinalSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    const result = signupRestaurantSchema.safeParse({
      restaurantName: form.restaurantName,
      phone: form.phone,
      address: form.address,
      capacity: form.capacity ? Number(form.capacity) : undefined,
    });
    if (!result.success) {
      setErrors(flattenErrors(result.error));
      return;
    }

    setLoading(true);
    setErrors({});

    const response = await completeSignup({
      name: form.name,
      email: form.email,
      password: form.password,
      restaurantName: form.restaurantName,
      phone: form.phone,
      address: form.address,
      capacity: form.capacity ? Number(form.capacity) : undefined,
    });

    if (!response.success) {
      toast.error(response.error);
      setLoading(false);
      return;
    }

    toast.success("Bienvenue sur TableFlow !");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Créer un compte</CardTitle>
        <p className="text-xs text-muted-foreground">Étape {step} sur 3</p>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Field label="Nom" htmlFor="name" required error={errors.name}>
              <Input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="email" required error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>
            <Field label="Mot de passe" htmlFor="password" required error={errors.password}>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
            </Field>
            <Button type="button" onClick={goToStep2} className="w-full">
              Continuer
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <Field label="Nom du restaurant" htmlFor="restaurantName" required error={errors.restaurantName}>
              <Input
                id="restaurantName"
                required
                value={form.restaurantName}
                onChange={(e) => update("restaurantName", e.target.value)}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                Retour
              </Button>
              <Button type="button" onClick={goToStep3} className="flex-1">
                Continuer
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="flex flex-col gap-4" noValidate>
            <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="Adresse" htmlFor="address" error={errors.address}>
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </Field>
            <Field label="Capacité approximative" htmlFor="capacity" error={errors.capacity}>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => update("capacity", e.target.value)}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                Retour
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Créer mon compte
              </Button>
            </div>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function flattenErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
