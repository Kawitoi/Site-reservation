import type { ReactNode } from "react";
import { SettingsNav } from "@/features/settings/settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Paramètres</h1>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsNav />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
