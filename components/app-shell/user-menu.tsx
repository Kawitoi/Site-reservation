"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

export function UserMenu({ name, role }: { name: string; role: Role }) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm leading-tight">
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Se déconnecter">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
