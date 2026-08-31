import { requireAppContext, requireRole } from "@/server/services/authorization";
import { db } from "@/lib/db";
import { getEffectivePlan } from "@/server/services/subscription";
import { LocationInfoForm } from "@/features/settings/location-info-form";
import { LocationsPanel } from "@/features/settings/locations-panel";
import { AccessRestricted } from "@/features/settings/access-restricted";

export default async function InformationsSettingsPage() {
  const { organization, currentLocation, locations } = await requireAppContext();

  let canEdit = true;
  try {
    await requireRole(organization.id, ["owner", "manager"]);
  } catch {
    canEdit = false;
  }

  if (!canEdit) return <AccessRestricted />;

  const [effectivePlan, locationCount] = await Promise.all([
    getEffectivePlan(organization.id),
    db.restaurantLocation.count({ where: { organizationId: organization.id } }),
  ]);
  const canAddLocation = !effectivePlan || locationCount < effectivePlan.limits.maxLocations;

  return (
    <div className="flex flex-col gap-6">
      <LocationInfoForm location={currentLocation} />
      <LocationsPanel
        locations={locations.map((l) => ({ id: l.id, name: l.name, city: l.city }))}
        currentLocationId={currentLocation.id}
        canAddLocation={canAddLocation}
      />
    </div>
  );
}
