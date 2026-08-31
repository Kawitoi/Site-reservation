"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanId } from "@/server/services/subscription";
import { createCheckoutSessionAction, createPortalSessionAction } from "@/server/actions/billing";

const STATUS_LABELS: Record<string, string> = {
  TRIALING: "Période d'essai",
  ACTIVE: "Actif",
  PAST_DUE: "Paiement en retard",
  CANCELED: "Annulé",
  UNPAID: "Impayé",
  INCOMPLETE: "Incomplet",
  INCOMPLETE_EXPIRED: "Expiré",
};

export function SubscriptionPanel({
  billingEnabled,
  plan,
  source,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  hasStripeCustomer,
  planLimits,
}: {
  billingEnabled: boolean;
  plan: PlanId | null;
  source: "subscription" | "trial" | "expired" | null;
  status: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  planLimits: Record<PlanId, { maxLocations: number; maxUsers: number; label: string }>;
}) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  async function handleSubscribe(target: PlanId) {
    setLoadingPlan(target);
    const result = await createCheckoutSessionAction(target);
    setLoadingPlan(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    window.location.assign(result.data.url);
  }

  async function handlePortal() {
    setLoadingPortal(true);
    const result = await createPortalSessionAction();
    setLoadingPortal(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    window.location.assign(result.data.url);
  }

  if (!billingEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            La facturation Stripe n&apos;est pas configurée sur cette instance. Toutes les fonctionnalités sont
            disponibles sans limite en attendant sa configuration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Abonnement actuel</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">
              {plan ? planLimits[plan].label : "Aucun"}
            </span>
            {status && <Badge variant={status === "ACTIVE" ? "success" : "warning"}>{STATUS_LABELS[status] ?? status}</Badge>}
            {source === "trial" && <Badge variant="outline">Essai gratuit</Badge>}
          </div>
          {currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              {cancelAtPeriodEnd ? "Se termine le " : "Renouvellement le "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(currentPeriodEnd)}
            </p>
          )}
          {hasStripeCustomer && (
            <Button variant="outline" onClick={handlePortal} loading={loadingPortal} className="self-start">
              Gérer mon abonnement
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(planLimits) as PlanId[]).map((id) => (
          <Card key={id}>
            <CardHeader>
              <CardTitle className="text-base text-foreground">{planLimits[id].label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="text-sm text-muted-foreground">
                <li>{planLimits[id].maxLocations} établissement(s)</li>
                <li>{planLimits[id].maxUsers} utilisateur(s)</li>
              </ul>
              <Button
                onClick={() => handleSubscribe(id)}
                loading={loadingPlan === id}
                disabled={plan === id && status === "ACTIVE"}
                variant={plan === id ? "outline" : "primary"}
              >
                {plan === id && status === "ACTIVE" ? "Offre actuelle" : "S'abonner"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
