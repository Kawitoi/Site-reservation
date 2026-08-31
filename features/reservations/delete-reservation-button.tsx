"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteReservationAction } from "@/server/actions/reservations";

export function DeleteReservationButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    const result = await deleteReservationAction(id);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Réservation supprimée.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <DialogContent title="Supprimer la réservation">
        <p className="text-sm text-muted-foreground">
          Voulez-vous vraiment supprimer la réservation de <strong>{label}</strong> ? Cette action est
          irréversible.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} loading={pending}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
