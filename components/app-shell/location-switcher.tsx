"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setCurrentLocation } from "@/server/actions/location";

export function LocationSwitcher({
  locations,
  currentLocationId,
}: {
  locations: { id: string; name: string }[];
  currentLocationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (locations.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {locations[0]?.name}
      </div>
    );
  }

  return (
    <Select
      value={currentLocationId}
      disabled={pending}
      onValueChange={(value) => {
        startTransition(async () => {
          await setCurrentLocation(value);
          router.refresh();
        });
      }}
    >
      <SelectTrigger className="w-56" aria-label="Établissement">
        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
