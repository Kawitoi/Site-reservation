import { db } from "@/lib/db";
import { recordAuditLog } from "@/server/services/audit";

export class TableValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TableValidationError";
  }
}

type TableInput = {
  locationId: string;
  name: string;
  seats: number;
  shape: "RECTANGLE" | "ROUND";
  x: number;
  y: number;
  width: number;
  height: number;
};

async function assertLocationOwnership(locationId: string, organizationId: string) {
  const location = await db.restaurantLocation.findUnique({ where: { id: locationId } });
  if (!location || location.organizationId !== organizationId) {
    throw new TableValidationError("Établissement introuvable.");
  }
  return location;
}

export async function createTable(input: TableInput, ctx: { organizationId: string; userId: string }) {
  await assertLocationOwnership(input.locationId, ctx.organizationId);

  return db.$transaction(async (tx) => {
    const table = await tx.table.create({ data: input });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "TABLE_CREATED",
      entityType: "Table",
      entityId: table.id,
    });
    return table;
  });
}

export async function updateTable(
  input: TableInput & { id: string },
  ctx: { organizationId: string; userId: string }
) {
  await assertLocationOwnership(input.locationId, ctx.organizationId);
  const existing = await db.table.findUnique({ where: { id: input.id } });
  if (!existing || existing.locationId !== input.locationId) {
    throw new TableValidationError("Table introuvable.");
  }

  return db.$transaction(async (tx) => {
    const table = await tx.table.update({
      where: { id: input.id },
      data: {
        name: input.name,
        seats: input.seats,
        shape: input.shape,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
      },
    });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "TABLE_UPDATED",
      entityType: "Table",
      entityId: table.id,
    });
    return table;
  });
}

/** Persists a drag-and-drop move from the floor plan editor (spec section 29/97). */
export async function moveTable(
  input: { id: string; locationId: string; x: number; y: number },
  ctx: { organizationId: string; userId: string }
) {
  await assertLocationOwnership(input.locationId, ctx.organizationId);
  const existing = await db.table.findUnique({ where: { id: input.id } });
  if (!existing || existing.locationId !== input.locationId) {
    throw new TableValidationError("Table introuvable.");
  }
  return db.table.update({ where: { id: input.id }, data: { x: input.x, y: input.y } });
}

export async function deleteTable(id: string, ctx: { organizationId: string; userId: string }) {
  const existing = await db.table.findUnique({ where: { id } });
  if (!existing) throw new TableValidationError("Table introuvable.");
  await assertLocationOwnership(existing.locationId, ctx.organizationId);

  const upcomingReservation = await db.reservation.findFirst({
    where: { tableId: id, status: "CONFIRMED", endAt: { gt: new Date() } },
  });
  if (upcomingReservation) {
    throw new TableValidationError(
      "Cette table a des réservations à venir. Annulez-les avant de la supprimer."
    );
  }

  await db.$transaction(async (tx) => {
    await tx.table.delete({ where: { id } });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "TABLE_DELETED",
      entityType: "Table",
      entityId: id,
    });
  });
}
