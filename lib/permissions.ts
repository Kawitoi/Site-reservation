import { createAccessControl } from "better-auth/plugins/access";

/**
 * Better Auth's organization plugin needs an access-control statement set to
 * gate its own endpoints (invite/remove member, update organization, ...).
 * This is intentionally minimal: only OWNER can manage members, invitations
 * and the organization record itself. Business-domain permissions
 * (reservations, tables, settings) are NOT modeled here — they are enforced
 * by the simpler role checks in server/services/authorization.ts, per spec
 * section 9 ("ne pas créer un système RBAC excessivement complexe").
 */
export const statement = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
} as const;

export const accessControl = createAccessControl(statement);

export const ownerRole = accessControl.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

export const managerRole = accessControl.newRole({
  organization: [],
  member: [],
  invitation: [],
});

export const staffRole = accessControl.newRole({
  organization: [],
  member: [],
  invitation: [],
});

export const roles = {
  owner: ownerRole,
  manager: managerRole,
  staff: staffRole,
};

export const ROLE_VALUES = ["owner", "manager", "staff"] as const;
export type Role = (typeof ROLE_VALUES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Propriétaire",
  manager: "Manager",
  staff: "Employé",
};
