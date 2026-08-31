"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

type InvitationInfo = {
  organizationName: string;
  email: string;
  role: string;
  status: string;
};

export default function AcceptInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authClient.organization
      .getInvitation({ query: { id } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setNotFound(true);
          return;
        }
        setInvitation({
          organizationName: data.organizationName,
          email: data.email,
          role: data.role,
          status: data.status,
        });
      })
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleAccept() {
    if (accepting) return;
    setAccepting(true);
    const { error } = await authClient.organization.acceptInvitation({ invitationId: id });
    if (error) {
      toast.error(error.message || "Impossible d'accepter l'invitation.");
      setAccepting(false);
      return;
    }
    toast.success("Invitation acceptée. Bienvenue !");
    router.push("/dashboard");
    router.refresh();
  }

  if (notFound) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Invitation introuvable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cette invitation n&apos;existe plus ou a expiré. Contactez la personne qui vous a invité.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!invitation || sessionPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (invitation.status !== "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Invitation déjà traitée</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cette invitation a déjà été utilisée ou annulée.</p>
        </CardContent>
      </Card>
    );
  }

  const role = ROLE_LABELS[invitation.role as Role] ?? invitation.role;

  if (!session?.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Invitation à rejoindre {invitation.organizationName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Connectez-vous avec <strong>{invitation.email}</strong> pour rejoindre {invitation.organizationName} en
            tant que {role}.
          </p>
          <Button asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (session.user.email !== invitation.email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Mauvais compte</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cette invitation est destinée à {invitation.email}, mais vous êtes connecté(e) avec{" "}
            {session.user.email}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Invitation à rejoindre {invitation.organizationName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Vous avez été invité(e) à rejoindre <strong>{invitation.organizationName}</strong> en tant que{" "}
          <strong>{role}</strong>.
        </p>
        <Button onClick={handleAccept} loading={accepting}>
          Accepter l&apos;invitation
        </Button>
      </CardContent>
    </Card>
  );
}
