"use server";

import { cookies } from "next/headers";
import { requireLocationAccess, LOCATION_COOKIE } from "@/server/services/authorization";

export async function setCurrentLocation(locationId: string) {
  await requireLocationAccess(locationId);
  const cookieStore = await cookies();
  cookieStore.set(LOCATION_COOKIE, locationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
