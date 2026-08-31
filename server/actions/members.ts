"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAppContext, requireRole } from "@/server/services/authorization";
import { assertCanInviteMember, PlanLimitError } from "@/server/services/subscription";
import { recordAuditLog } from "@/server/services/audit";
import { inviteMemberSchema, updateMemberRoleSchema, removeMemberSchema } from "@/server/validation/member";

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

export async function inviteMemberAction(rawInput: unknown): Promise<ActionResult<undefined>> {
  const { session, organization } = await requireAppContext();
  await requireRole(organization.id, ["owner"]);

  const parsed = inviteMemberSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    await assertCanInviteMember(organization.id);
  } catch (error) {
    return { success: false, error: error instanceof PlanLimitError ? error.message : "Erreur inattendue." };
  }

  try {
    await auth.api.createInvitation({
      body: { email: parsed.data.email, role: parsed.data.role, organizationId: organization.id },
      headers: await headers(),
    });
    await recordAuditLog(db, {
      organizationId: organization.id,
      userId: session.user.id,
      action: "MEMBER_INVITED",
      entityType: "Invitation",
      metadata: { email: parsed.data.email, role: parsed.data.role },
    });
    revalidatePath("/parametres/utilisateurs");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Impossible d'envoyer l'invitation.",
    };
  }
}

export async function updateMemberRoleAction(rawInput: unknown): Promise<ActionResult<undefined>> {
  const { session, organization } = await requireAppContext();
  await requireRole(organization.id, ["owner"]);

  const parsed = updateMemberRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  try {
    await auth.api.updateMemberRole({
      body: { memberId: parsed.data.memberId, role: parsed.data.role, organizationId: organization.id },
      headers: await headers(),
    });
    await recordAuditLog(db, {
      organizationId: organization.id,
      userId: session.user.id,
      action: "MEMBER_ROLE_UPDATED",
      entityType: "Member",
      entityId: parsed.data.memberId,
      metadata: { role: parsed.data.role },
    });
    revalidatePath("/parametres/utilisateurs");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur inattendue." };
  }
}

export async function removeMemberAction(rawInput: unknown): Promise<ActionResult<undefined>> {
  const { session, organization } = await requireAppContext();
  await requireRole(organization.id, ["owner"]);

  const parsed = removeMemberSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Membre invalide." };
  }

  const member = await db.member.findFirst({ where: { id: parsed.data.memberId, organizationId: organization.id } });
  if (!member) return { success: false, error: "Membre introuvable." };
  if (member.userId === session.user.id) {
    return { success: false, error: "Vous ne pouvez pas vous retirer vous-même." };
  }

  try {
    await auth.api.removeMember({
      body: { memberIdOrEmail: member.id, organizationId: organization.id },
      headers: await headers(),
    });
    await recordAuditLog(db, {
      organizationId: organization.id,
      userId: session.user.id,
      action: "MEMBER_REMOVED",
      entityType: "Member",
      entityId: member.id,
    });
    revalidatePath("/parametres/utilisateurs");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur inattendue." };
  }
}
