"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ROLE_LABELS, ROLE_VALUES, type Role } from "@/lib/permissions";
import { inviteMemberAction, updateMemberRoleAction, removeMemberAction } from "@/server/actions/members";

type MemberRow = { id: string; userId: string; name: string; email: string; role: Role };
type InvitationRow = { id: string; email: string; role: Role };

export function MembersPanel({
  members,
  invitations,
  currentUserId,
}: {
  members: MemberRow[];
  invitations: InvitationRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
  const [removing, setRemoving] = useState(false);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    setError(null);
    const result = await inviteMemberAction({ email, role });
    setInviting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    toast.success("Invitation envoyée.");
    setEmail("");
    router.refresh();
  }

  async function handleRoleChange(memberId: string, newRole: Role) {
    const result = await updateMemberRoleAction({ memberId, role: newRole });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Rôle mis à jour.");
    router.refresh();
  }

  async function handleRemove() {
    if (!removeTarget || removing) return;
    setRemoving(true);
    const result = await removeMemberAction({ memberId: removeTarget.id });
    setRemoving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Utilisateur retiré.");
    setRemoveTarget(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Inviter un utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3" noValidate>
            <Field label="Email" htmlFor="inv-email" required className="min-w-56">
              <Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Rôle" htmlFor="inv-role">
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="inv-role" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_VALUES.filter((r) => r !== "owner").map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit" loading={inviting}>
              Inviter
            </Button>
          </form>
          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membres</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {member.userId === currentUserId || member.role === "owner" ? (
                    <span className="text-xs font-medium text-muted-foreground">{ROLE_LABELS[member.role]}</span>
                  ) : (
                    <>
                      <Select value={member.role} onValueChange={(v) => handleRoleChange(member.id, v as Role)}>
                        <SelectTrigger className="w-36" aria-label={`Rôle de ${member.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_VALUES.filter((r) => r !== "owner").map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Retirer ${member.name}`}
                        onClick={() => setRemoveTarget(member)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{inv.email}</span>
                  <span className="text-xs text-muted-foreground">{ROLE_LABELS[inv.role]}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent title="Retirer cet utilisateur">
          <p className="text-sm text-muted-foreground">
            <strong>{removeTarget?.name}</strong> n&apos;aura plus accès à cette organisation.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={removing}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRemove} loading={removing}>
              Retirer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
