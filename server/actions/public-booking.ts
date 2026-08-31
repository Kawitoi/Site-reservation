"use server";

import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";
import { getPublicAvailability, createPublicBooking, PublicBookingError } from "@/server/services/public-booking";
import { availabilityQuerySchema, publicBookingSchema } from "@/server/validation/public-booking";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function getPublicAvailabilityAction(rawInput: unknown): Promise<ActionResult<string[]>> {
  const parsed = availabilityQuerySchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: "Requête invalide." };

  const ip = await getClientIp();
  const { allowed } = checkRateLimit(`availability:${ip}`, 60, 60_000);
  if (!allowed) return { success: false, error: "Trop de requêtes. Réessayez dans un instant." };

  const result = await getPublicAvailability(parsed.data);
  if (!result) return { success: false, error: "Établissement introuvable." };
  if (result.disabled) return { success: false, error: "Les réservations en ligne sont actuellement indisponibles." };
  return { success: true, data: result.slots };
}

export async function createPublicBookingAction(
  rawInput: unknown
): Promise<ActionResult<{ dateLabel: string; timeLabel: string; restaurantName: string; address: string | null }>> {
  const ip = await getClientIp();

  // Two layers: a generous per-IP limit for casual retries, and a much
  // stricter one specifically on successful-shaped submissions to blunt
  // scripted spam (spec section 55).
  const { allowed } = checkRateLimit(`public-booking:${ip}`, 5, 60_000);
  if (!allowed) {
    return { success: false, error: "Trop de tentatives. Réessayez dans une minute." };
  }

  const parsed = publicBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  // Honeypot: a real visitor never fills this hidden field.
  if (parsed.data.company) {
    logger.warn("public_booking.honeypot_triggered", { ip });
    return { success: false, error: "Une erreur est survenue." };
  }

  try {
    const result = await createPublicBooking(parsed.data);
    return {
      success: true,
      data: {
        dateLabel: result.dateLabel,
        timeLabel: result.timeLabel,
        restaurantName: result.location.name,
        address: result.location.address,
      },
    };
  } catch (error) {
    if (error instanceof PublicBookingError) return { success: false, error: error.message };
    logger.error("public_booking.unexpected_error", { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: "Une erreur est survenue. Réessayez." };
  }
}
