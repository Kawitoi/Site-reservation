import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { ReservationSource } from "@/lib/generated/prisma/client";
import { addMinutes, zonedDateTimeToUtc } from "@/lib/datetime";
import {
  isTableFree,
  suggestTable,
  type ExistingReservation,
  type TableInfo,
} from "@/server/services/availability";
import { findOrCreateCustomer } from "@/server/services/customer";
import { recordAuditLog } from "@/server/services/audit";

export class ReservationConflictError extends Error {
  constructor(message = "Ce créneau vient d'être réservé pour cette table.") {
    super(message);
    this.name = "ReservationConflictError";
  }
}

export class ReservationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationValidationError";
  }
}

const EXCLUSION_CONSTRAINT_NAME = "reservation_no_overlap";

/**
 * True when a Prisma error was caused by the `reservation_no_overlap`
 * Postgres EXCLUDE constraint (see prisma/migrations/..._reservation_no_overlap_constraint).
 * This is the last line of defense against concurrent double-booking —
 * spec section 38 ("course conditions").
 */
function isOverlapConstraintViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const constraint = error.meta?.constraint;
    if (typeof constraint === "string" && constraint.includes(EXCLUSION_CONSTRAINT_NAME)) return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(EXCLUSION_CONSTRAINT_NAME);
}

type ReservationInput = {
  locationId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  partySize: number;
  tableId?: string;
  source: ReservationSource;
  notes?: string;
};

async function loadLocationForReservation(locationId: string, organizationId: string) {
  const location = await db.restaurantLocation.findUnique({
    where: { id: locationId },
    include: { settings: true },
  });
  if (!location || location.organizationId !== organizationId) {
    throw new ReservationValidationError("Établissement introuvable.");
  }
  if (!location.settings) {
    throw new ReservationValidationError("Paramètres de l'établissement manquants.");
  }
  return location;
}

async function loadTablesAndOverlaps(
  locationId: string,
  startAt: Date,
  endAt: Date,
  excludeReservationId?: string
): Promise<{ tables: TableInfo[]; existing: ExistingReservation[] }> {
  const [tables, existing] = await Promise.all([
    db.table.findMany({ where: { locationId }, select: { id: true, name: true, seats: true } }),
    db.reservation.findMany({
      where: {
        locationId,
        status: "CONFIRMED",
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      },
      select: { id: true, tableId: true, startAt: true, endAt: true },
    }),
  ]);
  return { tables, existing };
}

/**
 * Creates a reservation for an authenticated staff member (manual booking
 * from the dashboard). Table selection, customer dedupe and the audit log
 * entry all happen inside one transaction (spec section 118); the
 * `reservation_no_overlap` DB constraint guarantees no double-booking even
 * under concurrent requests.
 */
export async function createReservation(
  input: ReservationInput,
  ctx: { organizationId: string; userId: string }
) {
  const location = await loadLocationForReservation(input.locationId, ctx.organizationId);
  const startAt = zonedDateTimeToUtc(input.date, input.time, location.timezone);
  const endAt = addMinutes(startAt, location.settings!.defaultReservationDurationMinutes);

  const { tables, existing } = await loadTablesAndOverlaps(input.locationId, startAt, endAt);

  let tableId: string | null = null;
  if (input.tableId) {
    const table = tables.find((t) => t.id === input.tableId);
    if (!table) throw new ReservationValidationError("Table introuvable.");
    if (!isTableFree(table, existing, startAt, endAt)) {
      throw new ReservationConflictError();
    }
    tableId = table.id;
  } else {
    tableId = suggestTable(tables, existing, input.partySize, startAt, endAt)?.id ?? null;
  }

  try {
    return await db.$transaction(async (tx) => {
      const customer = await findOrCreateCustomer(tx, ctx.organizationId, {
        name: input.customerName,
        phone: input.customerPhone,
        email: input.customerEmail,
      });

      const reservation = await tx.reservation.create({
        data: {
          organizationId: ctx.organizationId,
          locationId: input.locationId,
          tableId,
          customerId: customer.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone || null,
          customerEmail: input.customerEmail || null,
          partySize: input.partySize,
          startAt,
          endAt,
          source: input.source,
          notes: input.notes || null,
        },
      });

      await recordAuditLog(tx, {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: "RESERVATION_CREATED",
        entityType: "Reservation",
        entityId: reservation.id,
        metadata: { tableId, partySize: input.partySize },
      });

      return reservation;
    });
  } catch (error) {
    if (isOverlapConstraintViolation(error)) throw new ReservationConflictError();
    throw error;
  }
}

export async function updateReservation(
  input: ReservationInput & { id: string },
  ctx: { organizationId: string; userId: string }
) {
  const existingReservation = await db.reservation.findUnique({ where: { id: input.id } });
  if (!existingReservation || existingReservation.organizationId !== ctx.organizationId) {
    throw new ReservationValidationError("Réservation introuvable.");
  }

  const location = await loadLocationForReservation(input.locationId, ctx.organizationId);
  const startAt = zonedDateTimeToUtc(input.date, input.time, location.timezone);
  const endAt = addMinutes(startAt, location.settings!.defaultReservationDurationMinutes);

  const { tables, existing } = await loadTablesAndOverlaps(input.locationId, startAt, endAt, input.id);

  let tableId: string | null = null;
  if (input.tableId) {
    const table = tables.find((t) => t.id === input.tableId);
    if (!table) throw new ReservationValidationError("Table introuvable.");
    if (!isTableFree(table, existing, startAt, endAt, input.id)) {
      throw new ReservationConflictError();
    }
    tableId = table.id;
  } else {
    tableId = suggestTable(tables, existing, input.partySize, startAt, endAt, input.id)?.id ?? null;
  }

  try {
    return await db.$transaction(async (tx) => {
      const customer = await findOrCreateCustomer(tx, ctx.organizationId, {
        name: input.customerName,
        phone: input.customerPhone,
        email: input.customerEmail,
      });

      const reservation = await tx.reservation.update({
        where: { id: input.id },
        data: {
          locationId: input.locationId,
          tableId,
          customerId: customer.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone || null,
          customerEmail: input.customerEmail || null,
          partySize: input.partySize,
          startAt,
          endAt,
          source: input.source,
          notes: input.notes || null,
        },
      });

      await recordAuditLog(tx, {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: "RESERVATION_UPDATED",
        entityType: "Reservation",
        entityId: reservation.id,
      });

      return reservation;
    });
  } catch (error) {
    if (isOverlapConstraintViolation(error)) throw new ReservationConflictError();
    throw error;
  }
}

export async function deleteReservation(id: string, ctx: { organizationId: string; userId: string }) {
  const existingReservation = await db.reservation.findUnique({ where: { id } });
  if (!existingReservation || existingReservation.organizationId !== ctx.organizationId) {
    throw new ReservationValidationError("Réservation introuvable.");
  }

  await db.$transaction(async (tx) => {
    await tx.reservation.delete({ where: { id } });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "RESERVATION_DELETED",
      entityType: "Reservation",
      entityId: id,
    });
  });
}
