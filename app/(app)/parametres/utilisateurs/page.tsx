import { requireAppContext, requireRole } from "@/server/services/authorization";
import { db } from "@/lib/db";
import { MembersPanel } from "@/features/settings/members-panel";
import { AccessRestricted } from "@/features/settings/access-restricted";
import type { Role } from "@/lib/permissions";

export default async function MembersSettingsPage() {
  const { session, organization } = await requireAppContext();

  try {
    await requireRole(organization.id, ["owner"]);
  } catch {
    return <AccessRestricted />;
  }

  const [members, invitations] = await Promise.all([
    db.member.findMany({ where: { organizationId: organization.id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.invitation.findMany({ where: { organizationId: organization.id, status: "pending" } }),
  ]);

  return (
    <MembersPanel
      members={members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, email: m.user.email, role: m.role as Role }))}
      invitations={invitations.map((i) => ({ id: i.id, email: i.email, role: i.role as Role }))}
      currentUserId={session.user.id}
    />
  );
}
