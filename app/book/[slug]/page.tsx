import { notFound } from "next/navigation";
import { getPublicLocation } from "@/server/services/public-booking";
import { PublicBookingWizard } from "@/features/public-booking/public-booking-wizard";
import { todayInZone } from "@/lib/datetime";

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const location = await getPublicLocation(slug);

  if (!location) notFound();

  return (
    <div className="flex min-h-full flex-col items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">{location.name}</h1>
          {location.address && <p className="text-sm text-muted-foreground">{location.address}</p>}
        </div>

        {location.settings?.publicBookingEnabled ? (
          <PublicBookingWizard
            slug={slug}
            restaurantName={location.name}
            address={location.address}
            maxPartySize={location.settings.maxPartySize}
            defaultDate={todayInZone(location.timezone)}
          />
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Les réservations en ligne sont actuellement indisponibles. Merci de contacter directement le
            restaurant{location.phone ? ` au ${location.phone}` : ""}.
          </div>
        )}
      </div>
    </div>
  );
}
