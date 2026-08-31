"use server";

import { revalidatePath } from "next/cache";
import { requireAppContext, requireRole } from "@/server/services/authorization";
import {
  createTable,
  updateTable,
  moveTable,
  deleteTable,
  TableValidationError,
} from "@/server/services/table";
import { getTableStatuses } from "@/server/services/floor-plan";
import { createTableSchema, updateTableSchema, moveTableSchema } from "@/server/validation/table";

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

function revalidateFloorPlanViews() {
  revalidatePath("/plan-de-salle");
  revalidatePath("/reservations");
  revalidatePath("/planning");
}

export async function createTableAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const { session, currentLocation } = await requireAppContext();
  await requireRole(currentLocation.organizationId, ["owner", "manager"]);

  const withLocation =
    typeof rawInput === "object" && rawInput !== null
      ? { ...(rawInput as Record<string, unknown>), locationId: currentLocation.id }
      : rawInput;

  const parsed = createTableSchema.safeParse(withLocation);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    const table = await createTable(parsed.data, { organizationId: currentLocation.organizationId, userId: session.user.id });
    revalidateFloorPlanViews();
    return { success: true, data: { id: table.id } };
  } catch (error) {
    return { success: false, error: error instanceof TableValidationError ? error.message : "Erreur inattendue." };
  }
}

export async function updateTableAction(rawInput: unknown): Promise<ActionResult<undefined>> {
  const { session, currentLocation } = await requireAppContext();
  await requireRole(currentLocation.organizationId, ["owner", "manager"]);

  const withLocation =
    typeof rawInput === "object" && rawInput !== null
      ? { ...(rawInput as Record<string, unknown>), locationId: currentLocation.id }
      : rawInput;

  const parsed = updateTableSchema.safeParse(withLocation);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    await updateTable(parsed.data, { organizationId: currentLocation.organizationId, userId: session.user.id });
    revalidateFloorPlanViews();
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof TableValidationError ? error.message : "Erreur inattendue." };
  }
}

export async function moveTableAction(rawInput: unknown): Promise<ActionResult<undefined>> {
  const { session, currentLocation } = await requireAppContext();
  await requireRole(currentLocation.organizationId, ["owner", "manager"]);

  const withLocation =
    typeof rawInput === "object" && rawInput !== null
      ? { ...(rawInput as Record<string, unknown>), locationId: currentLocation.id }
      : rawInput;

  const parsed = moveTableSchema.safeParse(withLocation);
  if (!parsed.success) {
    return { success: false, error: "Position invalide." };
  }

  try {
    await moveTable(parsed.data, { organizationId: currentLocation.organizationId, userId: session.user.id });
    revalidatePath("/plan-de-salle");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof TableValidationError ? error.message : "Erreur inattendue." };
  }
}

export async function deleteTableAction(id: string): Promise<ActionResult<undefined>> {
  const { session, currentLocation } = await requireAppContext();
  await requireRole(currentLocation.organizationId, ["owner", "manager"]);

  try {
    await deleteTable(id, { organizationId: currentLocation.organizationId, userId: session.user.id });
    revalidateFloorPlanViews();
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof TableValidationError ? error.message : "Erreur inattendue." };
  }
}

export async function getTableStatusesAction(input: { date: string; time: string }) {
  const { currentLocation } = await requireAppContext();
  return getTableStatuses({
    locationId: currentLocation.id,
    timezone: currentLocation.timezone,
    date: input.date,
    time: input.time,
  });
}
