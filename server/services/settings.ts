import { db } from "@/lib/db";
import { recordAuditLog } from "@/server/services/audit";
import { assertCanCreateLocation, PlanLimitError } from "@/server/services/subscription";
import type { LocationInfoInput, ReservationSettingsInput, ServicesSettingsInput, CreateLocationInput } from "@/server/validation/settings";
import { slugify } from "@/lib/slug";
import { createId } from "@paralleldrive/cuid2";

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

async function assertLocationOwnership(locationId: string, organizationId: string) {
  const location = await db.restaurantLocation.findUnique({ where: { id: locationId } });
  if (!location || location.organizationId !== organizationId) {
    throw new SettingsValidationError("Établissement introuvable.");
  }
  return location;
}

export async function updateLocationInfo(input: LocationInfoInput, ctx: { organizationId: string; userId: string }) {
  await assertLocationOwnership(input.locationId, ctx.organizationId);

  const slugTaken = await db.restaurantLocation.findFirst({
    where: { publicSlug: input.publicSlug, NOT: { id: input.locationId } },
  });
  if (slugTaken) throw new SettingsValidationError("Cette adresse publique est déjà utilisée.");

  return db.$transaction(async (tx) => {
    const location = await tx.restaurantLocation.update({
      where: { id: input.locationId },
      data: {
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city || null,
        postalCode: input.postalCode || null,
        country: input.country || null,
        timezone: input.timezone,
        publicSlug: input.publicSlug,
      },
    });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "LOCATION_UPDATED",
      entityType: "RestaurantLocation",
      entityId: location.id,
    });
    return location;
  });
}

export async function updateReservationSettings(
  input: ReservationSettingsInput,
  ctx: { organizationId: string; userId: string }
) {
  await assertLocationOwnership(input.locationId, ctx.organizationId);

  return db.$transaction(async (tx) => {
    const settings = await tx.restaurantSettings.update({
      where: { locationId: input.locationId },
      data: {
        defaultReservationDurationMinutes: input.defaultReservationDurationMinutes,
        bookingIntervalMinutes: input.bookingIntervalMinutes,
        publicBookingEnabled: input.publicBookingEnabled,
        notifyOnNewPublicBooking: input.notifyOnNewPublicBooking,
        maxPartySize: input.maxPartySize,
        minimumBookingNoticeMinutes: input.minimumBookingNoticeMinutes,
        maxBookingDaysAhead: input.maxBookingDaysAhead,
      },
    });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SETTINGS_UPDATED",
      entityType: "RestaurantSettings",
      entityId: settings.id,
    });
    return settings;
  });
}

export async function updateServicesSettings(
  input: ServicesSettingsInput,
  ctx: { organizationId: string; userId: string }
) {
  await assertLocationOwnership(input.locationId, ctx.organizationId);

  return db.$transaction(async (tx) => {
    const settings = await tx.restaurantSettings.update({
      where: { locationId: input.locationId },
      data: {
        lunchOpensAt: input.lunchOpensAt || null,
        lunchClosesAt: input.lunchClosesAt || null,
        dinnerOpensAt: input.dinnerOpensAt || null,
        dinnerClosesAt: input.dinnerClosesAt || null,
        weeklySchedule: input.weeklySchedule,
      },
    });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SETTINGS_UPDATED",
      entityType: "RestaurantSettings",
      entityId: settings.id,
    });
    return settings;
  });
}

export async function createLocation(input: CreateLocationInput, ctx: { organizationId: string; userId: string }) {
  await assertCanCreateLocation(ctx.organizationId);

  const baseSlug = slugify(input.name);
  let publicSlug = baseSlug;
  for (let i = 2; i <= 20 && (await db.restaurantLocation.findUnique({ where: { publicSlug } })); i++) {
    publicSlug = `${baseSlug}-${i}`;
  }
  if (await db.restaurantLocation.findUnique({ where: { publicSlug } })) {
    publicSlug = `${baseSlug}-${createId().slice(0, 6)}`;
  }

  return db.$transaction(async (tx) => {
    const location = await tx.restaurantLocation.create({
      data: {
        organizationId: ctx.organizationId,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city || null,
        postalCode: input.postalCode || null,
        country: input.country,
        timezone: input.timezone,
        publicSlug,
      },
    });
    await tx.restaurantSettings.create({ data: { locationId: location.id } });
    await recordAuditLog(tx, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "LOCATION_CREATED",
      entityType: "RestaurantLocation",
      entityId: location.id,
    });
    return location;
  });
}

export { PlanLimitError };
