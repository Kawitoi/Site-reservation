import { db } from "@/lib/db";
import { computeAvailableSlots, suggestTable, type ExistingReservation } from "@/server/services/availability";
import { toScheduleConfig } from "@/server/services/settings-config";
import { findOrCreateCustomer } from "@/server/services/customer";
import { recordAuditLog } from "@/server/services/audit";
import { zonedDateTimeToUtc, addMinutes } from "@/lib/datetime";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  sendBookingConfirmation,
  sendRestaurantBookingNotification,
} from "@/lib/email";
import { logger } from "@/lib/logger";

export class PublicBookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicBookingError";
  }
}

const EXCLUSION_CONSTRAINT_NAME = "reservation_no_overlap";

function isOverlapConstraintViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const constraint = error.meta?.constraint;
    if (typeof constraint === "string" && constraint.includes(EXCLUSION_CONSTRAINT_NAME)) return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(EXCLUSION_CONSTRAINT_NAME);
}

export async function getPublicLocation(slug: string) {
  return db.restaurantLocation.findUnique({
    where: { publicSlug: slug },
    include: { settings: true },
  });
}

/**
 * Public availability lookup (spec sections 47-49): reuses the exact same
 * availability engine as manual reservation creation and the dashboard —
 * one source of truth (spec section 117).
 */
export async function getPublicAvailability(input: { slug: string; date: string; partySize: number }) {
  const location = await getPublicLocation(input.slug);
  if (!location || !location.settings) return null;
  if (!location.settings.publicBookingEnabled) return { location, slots: [] as string[], disabled: true as const };

  const [tables, reservations, closuresRaw] = await Promise.all([
    db.table.findMany({ where: { locationId: location.id }, select: { id: true, name: true, seats: true } }),
    db.reservation.findMany({
      where: { locationId: location.id, status: "CONFIRMED" },
      select: { id: true, tableId: true, startAt: true, endAt: true },
    }),
    db.specialClosure.findMany({ where: { locationId: location.id } }),
  ]);

  const slots = computeAvailableSlots({
    config: toScheduleConfig(location.settings),
    timezone: location.timezone,
    date: input.date,
    partySize: input.partySize,
    tables,
    reservations: reservations as ExistingReservation[],
    closures: closuresRaw.map((c) => ({ startAt: c.startAt, endAt: c.endAt })),
  });

  return { location, slots, disabled: false as const };
}

export async function createPublicBooking(input: {
  slug: string;
  date: string;
  time: string;
  partySize: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}) {
  const location = await getPublicLocation(input.slug);
  if (!location || !location.settings) throw new PublicBookingError("Établissement introuvable.");
  if (!location.settings.publicBookingEnabled) {
    throw new PublicBookingError("Les réservations en ligne sont actuellement indisponibles.");
  }
  if (input.partySize > location.settings.maxPartySize) {
    throw new PublicBookingError(
      `Pour les groupes de plus de ${location.settings.maxPartySize} personnes, contactez directement le restaurant.`
    );
  }

  const startAt = zonedDateTimeToUtc(input.date, input.time, location.timezone);
  const endAt = addMinutes(startAt, location.settings.defaultReservationDurationMinutes);

  const [tables, existing] = await Promise.all([
    db.table.findMany({ where: { locationId: location.id }, select: { id: true, name: true, seats: true } }),
    db.reservation.findMany({
      where: {
        locationId: location.id,
        status: "CONFIRMED",
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, tableId: true, startAt: true, endAt: true },
    }),
  ]);

  const table = suggestTable(tables, existing, input.partySize, startAt, endAt);
  if (!table) {
    throw new PublicBookingError("Ce créneau vient d'être réservé. Merci d'en choisir un autre.");
  }

  let reservation;
  try {
    reservation = await db.$transaction(async (tx) => {
      const customer = await findOrCreateCustomer(tx, location.organizationId, {
        name: input.name,
        phone: input.phone,
        email: input.email,
      });

      const created = await tx.reservation.create({
        data: {
          organizationId: location.organizationId,
          locationId: location.id,
          tableId: table.id,
          customerId: customer.id,
          customerName: input.name,
          customerPhone: input.phone,
          customerEmail: input.email || null,
          partySize: input.partySize,
          startAt,
          endAt,
          source: "WEBSITE",
          notes: input.notes || null,
        },
      });

      await recordAuditLog(tx, {
        organizationId: location.organizationId,
        action: "RESERVATION_CREATED",
        entityType: "Reservation",
        entityId: created.id,
        metadata: { source: "public_booking" },
      });

      return created;
    });
  } catch (error) {
    if (isOverlapConstraintViolation(error)) {
      throw new PublicBookingError("Ce créneau vient d'être réservé. Merci d'en choisir un autre.");
    }
    throw error;
  }

  const dateLabel = new Intl.DateTimeFormat("fr-FR", { timeZone: location.timezone, dateStyle: "long" }).format(startAt);
  const timeLabel = new Intl.DateTimeFormat("fr-FR", { timeZone: location.timezone, timeStyle: "short" }).format(startAt);

  if (input.email) {
    sendBookingConfirmation({
      to: input.email,
      restaurantName: location.name,
      address: location.address,
      dateLabel,
      timeLabel,
      partySize: input.partySize,
    }).catch((error) => logger.error("public_booking.confirmation_email_failed", { error: String(error) }));
  }

  if (location.settings.notifyOnNewPublicBooking && location.email) {
    sendRestaurantBookingNotification({
      to: location.email,
      customerName: input.name,
      dateLabel,
      timeLabel,
      partySize: input.partySize,
    }).catch((error) => logger.error("public_booking.notification_email_failed", { error: String(error) }));
  }

  return { reservation, location, dateLabel, timeLabel };
}
