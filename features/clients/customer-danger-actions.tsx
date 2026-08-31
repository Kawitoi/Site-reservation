"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { anonymizeCustomerAction, exportCustomerDataAction } from "@/server/actions/customers";

export function CustomerDangerActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    const result = await exportCustomerDataAction(id);
    setExporting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `client-${id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleAnonymize() {
    if (anonymizing) return;
    setAnonymizing(true);
    const result = await anonymizeCustomerAction(id);
    setAnonymizing(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Client anonymisé.");
    setConfirmOpen(false);
    router.push("/clients");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
        <Download className="h-4 w-4" /> Exporter les données
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
          <UserX className="h-4 w-4" /> Anonymiser / Supprimer
        </Button>
        <DialogContent title="Anonymiser ce client">
          <p className="text-sm text-muted-foreground">
            Le nom, le téléphone, l&apos;email et les notes de <strong>{name}</strong> seront définitivement
            effacés, y compris sur son historique de réservations. Les réservations elles-mêmes sont
            conservées à des fins statistiques. Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={anonymizing}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleAnonymize} loading={anonymizing}>
              Anonymiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
