import { db } from "@/lib/db";

export type PlanId = "starter" | "pro";

export const PLAN_LIMITS: Record<PlanId, { maxLocations: number; maxUsers: number; label: string }> = {
  starter: { maxLocations: 1, maxUsers: 3, label: "Starter" },
  pro: { maxLocations: 10, maxUsers: 25, label: "Pro" },
};

const TRIAL_DAYS = 14;

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function resolvePlanFromPriceId(priceId: string | null): PlanId {
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "starter";
}

/**
 * Server-side plan resolution (spec section 78: "ne pas faire confiance à
 * l'état envoyé par le frontend"). Returns `null` when billing enforcement
 * is disabled (no Stripe keys configured — local/dev), meaning no limits
 * apply.
 */
export async function getEffectivePlan(
  organizationId: string
): Promise<{ plan: PlanId; limits: { maxLocations: number; maxUsers: number }; source: "subscription" | "trial" | "expired" } | null> {
  if (!isStripeConfigured()) return null;

  const [subscription, organization] = await Promise.all([
    db.subscription.findUnique({ where: { organizationId } }),
    db.organization.findUnique({ where: { id: organizationId }, select: { createdAt: true } }),
  ]);

  if (subscription && (subscription.status === "ACTIVE" || subscription.status === "TRIALING")) {
    const plan = resolvePlanFromPriceId(subscription.stripePriceId);
    return { plan, limits: PLAN_LIMITS[plan], source: "subscription" };
  }

  const createdAt = organization?.createdAt ?? new Date();
  const trialEndsAt = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  if (new Date() < trialEndsAt) {
    return { plan: "starter", limits: PLAN_LIMITS.starter, source: "trial" };
  }

  // Trial expired and no active subscription: fall back to Starter-level
  // caps rather than locking the account out entirely.
  return { plan: "starter", limits: PLAN_LIMITS.starter, source: "expired" };
}

export async function assertCanCreateLocation(organizationId: string) {
  const effective = await getEffectivePlan(organizationId);
  if (!effective) return;

  const count = await db.restaurantLocation.count({ where: { organizationId } });
  if (count >= effective.limits.maxLocations) {
    throw new PlanLimitError(
      `Votre offre ${PLAN_LIMITS[effective.plan].label} est limitée à ${effective.limits.maxLocations} établissement(s). Passez à une offre supérieure pour en ajouter.`
    );
  }
}

export async function assertCanInviteMember(organizationId: string) {
  const effective = await getEffectivePlan(organizationId);
  if (!effective) return;

  const [memberCount, pendingInvitationCount] = await Promise.all([
    db.member.count({ where: { organizationId } }),
    db.invitation.count({ where: { organizationId, status: "pending" } }),
  ]);

  if (memberCount + pendingInvitationCount >= effective.limits.maxUsers) {
    throw new PlanLimitError(
      `Votre offre ${PLAN_LIMITS[effective.plan].label} est limitée à ${effective.limits.maxUsers} utilisateur(s). Passez à une offre supérieure pour en inviter davantage.`
    );
  }
}
