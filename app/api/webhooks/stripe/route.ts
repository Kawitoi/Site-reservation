import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { processStripeWebhookEvent } from "@/server/services/billing";
import { logger } from "@/lib/logger";

/**
 * Stripe webhook endpoint (spec section 74). Signature verification is
 * mandatory — never trust the payload without it. Idempotency is handled
 * one layer down in processStripeWebhookEvent via the ProcessedWebhook
 * table (spec section 75).
 */
export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    logger.error("stripe.webhook_not_configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    logger.error("stripe.webhook_signature_invalid", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await processStripeWebhookEvent(event);
  } catch (error) {
    logger.error("stripe.webhook_processing_failed", {
      eventId: event.id,
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
