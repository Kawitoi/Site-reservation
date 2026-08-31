import { requireAppContext, requireRole } from "@/server/services/authorization";
import { db } from "@/lib/db";
import { ServicesSettingsForm } from "@/features/settings/services-settings-form";
import { AccessRestricted } from "@/features/settings/access-restricted";
import { parseWeeklySchedule } from "@/server/services/settings-config";

export default async function ServicesSettingsPage() {
  const { organization, currentLocation } = await requireAppContext();

  try {
    await requireRole(organization.id, ["owner", "manager"]);
  } catch {
    return <AccessRestricted />;
  }

  const settings = await db.restaurantSettings.findUniqueOrThrow({ where: { locationId: currentLocation.id } });

  return (
    <ServicesSettingsForm
      settings={{
        lunchOpensAt: settings.lunchOpensAt,
        lunchClosesAt: settings.lunchClosesAt,
        dinnerOpensAt: settings.dinnerOpensAt,
        dinnerClosesAt: settings.dinnerClosesAt,
        weeklySchedule: parseWeeklySchedule(settings.weeklySchedule),
      }}
    />
  );
}
