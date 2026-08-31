"use server";

import { revalidatePath } from "next/cache";
import { requireAppContext, requireRole } from "@/server/services/authorization";
import {
  updateLocationInfo,
  updateReservationSettings,
  updateServicesSettings,
  createLocation,
  SettingsValidationError,
  PlanLimitError,
} from "@/server/services/settings";
import {
  locationInfoSchema,
  reservationSettingsSchema,
  servicesSettingsSchema,
  createLocationSchema,
} from "@/server/validation/settings";

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

function settingsErrorMessage(error: unknown): string {
  if (error instanceof SettingsValidationError) return error.message;
  if (error instanceof PlanLimitError) return error.message;
  return "Erreur inattendue.";
}

export async function updateLocationInfoAction(rawInput: unknown): Promise<ActionResult<undefined>> {
  const { session, currentLocation } = await requireAppContext();
  await requireRole(currentLocation.organizationId, ["owner", "manager"]);

  const withLocation =
    typeof rawInput === "object" && rawInput !== null
      ? { ...(rawInput as Record<string, unknown>), locationId: currentLocation.id }
      : rawInput;

  const parsed = locationInfoSchema.safeParse(withLocation);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    await updateLocationInfo(parsed.data, { organizationId: currentLocation.organizationId, userId: session.user.id });
    revalidatePath("/parametres/informations");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: settingsErrorMessage(error) };
  }
}

export async function updateReservationSettingsAction(rawInput: unknown): Promise<ActionResult<undefined>> {
  const { session, currentLocation } = await requireAppContext();
  await requireRole(currentLocation.organizationId, ["owner", "manager"]);

  const withLocation =
    typeof rawInput === "object" && rawInput !== null
      ? { ...(rawInput as Record<string, unknown>), locationId: currentLocation.id }
      : rawInput;

  const parsed = reservationSettingsSchema.safeParse(withLocation);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    await updateReservationSettings(parsed.data, {
      organizationId: currentLocation.organizationId,
      userId: session.user.id,
    });
    revalidatePath("/parametres/reservations");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: settingsErrorMessage(error) };
  }
}

export async function updateServicesSettingsAction(rawInput: unknown): Promise<ActionResult<undefined>> {
  const { session, currentLocation } = await requireAppContext();
  await requireRole(currentLocation.organizationId, ["owner", "manager"]);

  const withLocation =
    typeof rawInput === "object" && rawInput !== null
      ? { ...(rawInput as Record<string, unknown>), locationId: currentLocation.id }
      : rawInput;

  const parsed = servicesSettingsSchema.safeParse(withLocation);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    await updateServicesSettings(parsed.data, { organizationId: currentLocation.organizationId, userId: session.user.id });
    revalidatePath("/parametres/services");
    revalidatePath("/dashboard");
    revalidatePath("/plan-de-salle");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: settingsErrorMessage(error) };
  }
}

export async function createLocationAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const { session, organization } = await requireAppContext();
  await requireRole(organization.id, ["owner"]);

  const parsed = createLocationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    const location = await createLocation(parsed.data, { organizationId: organization.id, userId: session.user.id });
    revalidatePath("/parametres/informations");
    return { success: true, data: { id: location.id } };
  } catch (error) {
    return { success: false, error: settingsErrorMessage(error) };
  }
}
