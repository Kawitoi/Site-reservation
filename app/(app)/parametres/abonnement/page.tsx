import { requireAppContext, requireRole } from "@/server/services/authorization";
import { db } from "@/lib/db";
import { getEffectivePlan, PLAN_LIMITS } from "@/server/services/subscription";
import { AccessRestricted } from "@/features/settings/access-restricted";
import { SubscriptionPanel } from "@/features/settings/subscription-panel";

export default async function SubscriptionSettingsPage() {
  const { organization } = await requireAppContext();

  try {
    await requireRole(organization.id, ["owner"]);
  } catch {
    return <AccessRestricted />;
  }

  const [subscription, effectivePlan] = await Promise.all([
    db.subscription.findUnique({ where: { organizationId: organization.id } }),
    getEffectivePlan(organization.id),
  ]);

  return (
    <SubscriptionPanel
      billingEnabled={effectivePlan !== null}
      plan={effectivePlan?.plan ?? null}
      source={effectivePlan?.source ?? null}
      status={subscription?.status ?? null}
      currentPeriodEnd={subscription?.currentPeriodEnd ?? null}
      cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
      hasStripeCustomer={Boolean(subscription?.stripeCustomerId)}
      planLimits={PLAN_LIMITS}
    />
  );
}
