import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { recordAuditLog } from "@/server/services/audit";

type TransactionClient = Prisma.TransactionClient;

export class CustomerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerValidationError";
  }
}

/**
 * Reuses an existing Customer by phone number within the organization, or
 * creates a new one — spec section 24. Phone is the dedupe key because it
 * is required on every reservation path (manual and public); email is not.
 */
export async function findOrCreateCustomer(
  tx: TransactionClient,
  organizationId: string,
  input: { name: string; phone?: string | null; email?: string | null }
) {
  const phone = input.phone?.trim() || null;

  if (phone) {
    const existing = await tx.customer.findFirst({
      where: { organizationId, phone, anonymizedAt: null },
    });
    if (existing) {
      const needsUpdate =
        (input.email && input.email !== existing.email) || input.name !== existing.name;
      if (needsUpdate) {
        return tx.customer.update({
          where: { id: existing.id },
          data: {
            name: input.name || existing.name,
            email: input.email || existing.email,
          },
        });
      }
      return existing;
    }
  }

  return tx.customer.create({
    data: {
      organizationId,
      name: input.name,
      phone,
      email: input.email?.trim() || null,
    },
  });
}

export async function updateCustomer(
  input: { id: string; name: string; phone?: string; email?: string; notes?: string },
  ctx: { organizationId: string; userId: string }
) {
  const existing = await db.customer.findFirst({ where: { id: input.id, organizationId: ctx.organizationId } });
  if (!existing) throw new CustomerValidationError("Client introuvable.");

  return db.$transaction(async (tx) => {
    const customer = await tx.customer.update({
      where: { id: input.id },
      data: {
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        notes: input.notes || null,
      },
    });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: customer.id,
    });
    return customer;
  });
}

const ANONYMIZED_NAME = "Client anonymisé";

/**
 * RGPD anonymization (spec sections 102-103): scrubs personal data from the
 * Customer record AND from the denormalized snapshot stored on each of
 * their past Reservation rows, while keeping the reservations themselves
 * (date, party size, table) for business history/reporting.
 */
export async function anonymizeCustomer(id: string, ctx: { organizationId: string; userId: string }) {
  const existing = await db.customer.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) throw new CustomerValidationError("Client introuvable.");

  await db.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id },
      data: { name: ANONYMIZED_NAME, phone: null, email: null, notes: null, anonymizedAt: new Date() },
    });
    await tx.reservation.updateMany({
      where: { customerId: id },
      data: { customerName: ANONYMIZED_NAME, customerPhone: null, customerEmail: null },
    });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CUSTOMER_DELETED",
      entityType: "Customer",
      entityId: id,
    });
  });
}

/** RGPD export (spec section 102): everything TableFlow holds about one customer, as plain data. */
export async function exportCustomerData(id: string, organizationId: string) {
  const customer = await db.customer.findFirst({ where: { id, organizationId } });
  if (!customer) throw new CustomerValidationError("Client introuvable.");

  const reservations = await db.reservation.findMany({
    where: { customerId: id },
    orderBy: { startAt: "desc" },
    include: { location: { select: { name: true } }, table: { select: { name: true } } },
  });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      createdAt: customer.createdAt,
    },
    reservations: reservations.map((r) => ({
      date: r.startAt,
      partySize: r.partySize,
      location: r.location.name,
      table: r.table?.name ?? null,
      source: r.source,
      status: r.status,
    })),
  };
}
