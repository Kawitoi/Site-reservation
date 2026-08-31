"use server";

import { requireAppContext, requireRole } from "@/server/services/authorization";
import { createCheckoutSession, createPortalSession, BillingError } from "@/server/services/billing";
import type { PlanId } from "@/server/services/subscription";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const appUrl = process.env.APP_URL || "http://localhost:3000";

export async function createCheckoutSessionAction(plan: PlanId): Promise<ActionResult<{ url: string }>> {
  const { session, organization } = await requireAppContext();
  await requireRole(organization.id, ["owner"]);

  try {
    const url = await createCheckoutSession({
      organizationId: organization.id,
      organizationName: organization.name,
      userEmail: session.user.email,
      plan,
      appUrl,
    });
    return { success: true, data: { url } };
  } catch (error) {
    return { success: false, error: error instanceof BillingError ? error.message : "Erreur inattendue." };
  }
}

export async function createPortalSessionAction(): Promise<ActionResult<{ url: string }>> {
  const { organization } = await requireAppContext();
  await requireRole(organization.id, ["owner"]);

  try {
    const url = await createPortalSession({ organizationId: organization.id, appUrl });
    return { success: true, data: { url } };
  } catch (error) {
    return { success: false, error: error instanceof BillingError ? error.message : "Erreur inattendue." };
  }
}
