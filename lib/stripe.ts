import Stripe from "stripe";

let cachedClient: Stripe | null | undefined;

/**
 * Returns the Stripe client, or `null` when billing is not configured
 * (spec section 80: TableFlow must run locally without Stripe keys). Every
 * caller must handle the `null` case explicitly rather than assuming
 * billing is always on.
 */
export function getStripeClient(): Stripe | null {
  if (cachedClient !== undefined) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  cachedClient = secretKey ? new Stripe(secretKey) : null;
  return cachedClient;
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
