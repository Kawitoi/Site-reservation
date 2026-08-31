import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-24 text-center">
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="text-2xl font-semibold text-foreground">Page introuvable</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Cette page n&apos;existe pas ou plus. Vérifiez l&apos;adresse ou revenez à l&apos;accueil.
      </p>
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
