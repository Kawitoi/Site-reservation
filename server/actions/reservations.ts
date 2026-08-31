"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAppContext, ForbiddenError } from "@/server/services/authorization";
import {
  createReservation,
  updateReservation,
  deleteReservation,
  ReservationConflictError,
  ReservationValidationError,
} from "@/server/services/reservation";
import { createReservationSchema, updateReservationSchema } from "@/server/validation/reservation";

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

function revalidateReservationViews() {
  revalidatePath("/reservations");
  revalidatePath("/planning");
  revalidatePath("/dashboard");
  revalidatePath("/plan-de-salle");
}

export async function createReservationAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string; tableAssigned: boolean }>> {
  const { session, currentLocation } = await requireAppContext();

  // The client always leaves locationId blank — the current location comes
  // from the server-resolved context, never from client input (spec
  // section 6). Fill it in before validation so the shape check still runs.
  const withLocation =
    typeof rawInput === "object" && rawInput !== null
      ? { ...(rawInput as Record<string, unknown>), locationId: currentLocation.id }
      : rawInput;

  const parsed = createReservationSchema.safeParse(withLocation);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    const reservation = await createReservation(
      { ...parsed.data, locationId: currentLocation.id, tableId: parsed.data.tableId || undefined },
      { organizationId: currentLocation.organizationId, userId: session.user.id }
    );
    revalidateReservationViews();
    return { success: true, data: { id: reservation.id, tableAssigned: reservation.tableId !== null } };
  } catch (error) {
    return { success: false, error: reservationErrorMessage(error) };
  }
}

export async function updateReservationAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string; tableAssigned: boolean }>> {
  const { session, currentLocation } = await requireAppContext();

  const withLocation =
    typeof rawInput === "object" && rawInput !== null
      ? { ...(rawInput as Record<string, unknown>), locationId: currentLocation.id }
      : rawInput;

  const parsed = updateReservationSchema.safeParse(withLocation);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    const reservation = await updateReservation(
      { ...parsed.data, locationId: currentLocation.id, tableId: parsed.data.tableId || undefined },
      { organizationId: currentLocation.organizationId, userId: session.user.id }
    );
    revalidateReservationViews();
    return { success: true, data: { id: reservation.id, tableAssigned: reservation.tableId !== null } };
  } catch (error) {
    return { success: false, error: reservationErrorMessage(error) };
  }
}

export async function deleteReservationAction(id: string): Promise<ActionResult<undefined>> {
  const { session, organization } = await requireAppContext();

  const existing = await db.reservation.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== organization.id) {
    return { success: false, error: "Réservation introuvable." };
  }

  try {
    await deleteReservation(id, { organizationId: organization.id, userId: session.user.id });
    revalidateReservationViews();
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: reservationErrorMessage(error) };
  }
}

function reservationErrorMessage(error: unknown): string {
  if (error instanceof ReservationConflictError) return error.message;
  if (error instanceof ReservationValidationError) return error.message;
  if (error instanceof ForbiddenError) return error.message;
  return "Une erreur est survenue. Réessayez.";
}
