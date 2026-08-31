"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Route-segment error boundary. Never surfaces the raw error message (it
 * may contain a stack trace, a Prisma error, or other internals) — spec
 * section 66. The real error is logged server-side via the Server
 * Component that threw; this client-side log is best-effort for visibility
 * into the client render path.
 */
export default function ErrorBoundary({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("app.render_error", { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-24 text-center">
      <p className="text-sm font-medium text-destructive">Erreur</p>
      <h1 className="text-2xl font-semibold text-foreground">Une erreur est survenue</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Quelque chose s&apos;est mal passé. Réessayez, ou revenez à l&apos;accueil si le problème persiste.
      </p>
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
