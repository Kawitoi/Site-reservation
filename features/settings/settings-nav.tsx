"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/parametres/informations", label: "Informations" },
  { href: "/parametres/reservations", label: "Réservations" },
  { href: "/parametres/services", label: "Services" },
  { href: "/parametres/tables", label: "Tables" },
  { href: "/parametres/utilisateurs", label: "Utilisateurs" },
  { href: "/parametres/abonnement", label: "Abonnement" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-48 lg:flex-col" aria-label="Sections des paramètres">
      {SECTIONS.map((section) => {
        const active = pathname.startsWith(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
