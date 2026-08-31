import "server-only";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/lib/permissions";

export const LOCATION_COOKIE = "tf_location_id";

/**
 * Central authorization layer. Every Server Action and Route Handler that
 * touches tenant data MUST go through one of these helpers instead of
 * trusting an `organizationId` / `locationId` sent by the client — see spec
 * section 6 ("isolation des données").
 */

export class AuthError extends Error {
  constructor(message = "Vous devez être connecté.") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Accès refusé.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type SessionResult = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function getCurrentSession(): Promise<SessionResult | null> {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser(): Promise<SessionResult> {
  const session = await getCurrentSession();
  if (!session?.user) throw new AuthError();
  return session;
}

/** Returns the caller's membership row, deriving org membership from the DB — never from client input. */
export async function requireMembership(organizationId: string) {
  const session = await requireUser();
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.user.id } },
  });
  if (!member) throw new ForbiddenError("Vous n'appartenez pas à cette organisation.");
  return { session, member };
}

export async function requireRole(organizationId: string, allowed: Role[]) {
  const { session, member } = await requireMembership(organizationId);
  if (!allowed.includes(member.role as Role)) {
    throw new ForbiddenError("Votre rôle ne permet pas cette action.");
  }
  return { session, member };
}

/**
 * Resolves a RestaurantLocation server-side and checks the caller belongs to
 * its Organization (optionally restricted to a set of roles). The
 * `locationId` may come straight from the client — this function is what
 * makes that safe.
 */
export async function requireLocationAccess(locationId: string, allowed?: Role[]) {
  const location = await db.restaurantLocation.findUnique({ where: { id: locationId } });
  if (!location) throw new ForbiddenError("Établissement introuvable.");

  const { session, member } = allowed
    ? await requireRole(location.organizationId, allowed)
    : await requireMembership(location.organizationId);

  return { session, member, location };
}

/**
 * Returns the single organization the current user belongs to. TableFlow
 * only supports one organization per user (see spec section 8: signup
 * always creates exactly one Organization + Membership OWNER).
 */
export async function requireUserOrganization() {
  const session = await requireUser();
  const activeOrgId = session.session.activeOrganizationId;

  const member = await db.member.findFirst({
    where: activeOrgId
      ? { userId: session.user.id, organizationId: activeOrgId }
      : { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (!member) throw new ForbiddenError("Aucune organisation associée à ce compte.");
  return { session, member, organization: member.organization };
}

/**
 * Full context needed by every (app) route: session, membership, all of the
 * org's locations, and the currently selected one. The selection is read
 * from a cookie — a purely visual preference (spec section 3: "dernier
 * établissement sélectionné" is explicitly allowed in client storage) — but
 * is always re-validated against the DB-derived organization before use.
 */
export async function requireAppContext() {
  const { session, member, organization } = await requireUserOrganization();

  const locations = await db.restaurantLocation.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "asc" },
  });

  if (locations.length === 0) {
    throw new ForbiddenError("Aucun établissement configuré.");
  }

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(LOCATION_COOKIE)?.value;
  const currentLocation = locations.find((l) => l.id === selectedId) ?? locations[0];

  return { session, member, organization, locations, currentLocation };
}
