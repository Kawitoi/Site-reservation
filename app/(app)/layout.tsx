import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthError, ForbiddenError, requireAppContext } from "@/server/services/authorization";
import { Sidebar } from "@/components/app-shell/sidebar";
import { LocationSwitcher } from "@/components/app-shell/location-switcher";
import { UserMenu } from "@/components/app-shell/user-menu";
import type { Role } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let context;
  try {
    context = await requireAppContext();
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    if (error instanceof ForbiddenError) redirect("/signup");
    throw error;
  }

  const { session, member, locations, currentLocation } = context;

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="border-b border-border px-4 py-4 text-lg font-semibold text-foreground">TableFlow</div>
        <nav aria-label="Navigation principale" className="flex-1">
          <Sidebar className="flex-1" />
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 md:px-6">
          <LocationSwitcher
            locations={locations.map((l) => ({ id: l.id, name: l.name }))}
            currentLocationId={currentLocation.id}
          />
          <UserMenu name={session.user.name} role={member.role as Role} />
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-1 md:hidden" aria-label="Navigation principale">
          <Sidebar className="flex-row p-0" />
        </nav>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
