"use server";

import { revalidatePath } from "next/cache";
import { requireAppContext } from "@/server/services/authorization";
import { updateCustomer, anonymizeCustomer, exportCustomerData, CustomerValidationError } from "@/server/services/customer";
import { updateCustomerSchema } from "@/server/validation/customer";

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

export async function updateCustomerAction(rawInput: unknown): Promise<ActionResult<undefined>> {
  const { session, organization } = await requireAppContext();

  const parsed = updateCustomerSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    await updateCustomer(parsed.data, { organizationId: organization.id, userId: session.user.id });
    revalidatePath("/clients");
    revalidatePath(`/clients/${parsed.data.id}`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof CustomerValidationError ? error.message : "Erreur inattendue." };
  }
}

export async function anonymizeCustomerAction(id: string): Promise<ActionResult<undefined>> {
  const { session, organization } = await requireAppContext();

  try {
    await anonymizeCustomer(id, { organizationId: organization.id, userId: session.user.id });
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof CustomerValidationError ? error.message : "Erreur inattendue." };
  }
}

export async function exportCustomerDataAction(
  id: string
): Promise<ActionResult<Awaited<ReturnType<typeof exportCustomerData>>>> {
  const { organization } = await requireAppContext();
  try {
    const data = await exportCustomerData(id, organization.id);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof CustomerValidationError ? error.message : "Erreur inattendue." };
  }
}
