import { requireAppContext, requireRole } from "@/server/services/authorization";
import { db } from "@/lib/db";
import { ReservationSettingsForm } from "@/features/settings/reservation-settings-form";
import { AccessRestricted } from "@/features/settings/access-restricted";

export default async function ReservationSettingsPage() {
  const { organization, currentLocation } = await requireAppContext();

  try {
    await requireRole(organization.id, ["owner", "manager"]);
  } catch {
    return <AccessRestricted />;
  }

  const settings = await db.restaurantSettings.findUniqueOrThrow({ where: { locationId: currentLocation.id } });

  return <ReservationSettingsForm settings={settings} />;
}
