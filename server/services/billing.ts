import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import type { SubscriptionStatus } from "@/lib/generated/prisma/client";
import type { PlanId } from "@/server/services/subscription";

export class BillingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingError";
  }
}

function priceIdForPlan(plan: PlanId): string {
  const priceId = plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_STARTER;
  if (!priceId) throw new BillingError("Cette offre n'est pas configurée.");
  return priceId;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    default:
      // "paused" and any future Stripe status not in our enum: treat as
      // unpaid rather than silently reporting an active subscription.
      return "UNPAID";
  }
}

export async function createCheckoutSession(input: {
  organizationId: string;
  organizationName: string;
  userEmail: string;
  plan: PlanId;
  appUrl: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) throw new BillingError("La facturation n'est pas configurée.");

  const existing = await db.subscription.findUnique({ where: { organizationId: input.organizationId } });

  let stripeCustomerId = existing?.stripeCustomerId ?? undefined;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: input.userEmail,
      name: input.organizationName,
      metadata: { organizationId: input.organizationId },
    });
    stripeCustomerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    client_reference_id: input.organizationId,
    line_items: [{ price: priceIdForPlan(input.plan), quantity: 1 }],
    subscription_data: { metadata: { organizationId: input.organizationId } },
    success_url: `${input.appUrl}/parametres/abonnement?checkout=success`,
    cancel_url: `${input.appUrl}/parametres/abonnement?checkout=cancelled`,
  });

  if (!session.url) throw new BillingError("Impossible de créer la session de paiement.");
  return session.url;
}

export async function createPortalSession(input: { organizationId: string; appUrl: string }) {
  const stripe = getStripeClient();
  if (!stripe) throw new BillingError("La facturation n'est pas configurée.");

  const subscription = await db.subscription.findUnique({ where: { organizationId: input.organizationId } });
  if (!subscription?.stripeCustomerId) {
    throw new BillingError("Aucun abonnement Stripe associé à cette organisation.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${input.appUrl}/parametres/abonnement`,
  });
  return session.url;
}

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    logger.warn("stripe.subscription_missing_org_metadata", { subscriptionId: subscription.id });
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;
  const currentPeriodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  await db.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: mapStripeStatus(subscription.status),
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: mapStripeStatus(subscription.status),
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

/**
 * Processes one verified Stripe webhook event. Idempotent via the
 * ProcessedWebhook table keyed on Stripe's event id (spec section 75):
 * replays of the same event are detected and skipped before any write.
 */
export async function processStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  const already = await db.processedWebhook.findUnique({ where: { stripeEventId: event.id } });
  if (already) {
    logger.info("stripe.webhook_duplicate_skipped", { eventId: event.id, type: event.type });
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") {
        const stripe = getStripeClient();
        if (stripe) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await upsertSubscriptionFromStripe(subscription);
        }
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata?.organizationId;
      if (organizationId) {
        await db.subscription.updateMany({
          where: { organizationId },
          data: { status: "CANCELED" },
        });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      logger.error("stripe.invoice_payment_failed", { invoiceId: invoice.id, customerId: String(invoice.customer) });
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await db.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }
    default:
      break;
  }

  await db.processedWebhook.create({ data: { stripeEventId: event.id, type: event.type } });
}
