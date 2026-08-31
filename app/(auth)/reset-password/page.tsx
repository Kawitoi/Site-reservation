"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !token) return;
    setLoading(true);
    setError(null);

    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });

    if (resetError) {
      setError(resetError.message || "Impossible de réinitialiser le mot de passe.");
      setLoading(false);
      return;
    }

    toast.success("Mot de passe mis à jour.");
    router.push("/login");
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Lien invalide</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau depuis la page de connexion.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Nouveau mot de passe</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Nouveau mot de passe" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            Réinitialiser le mot de passe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
