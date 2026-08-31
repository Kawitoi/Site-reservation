import { Card, CardContent } from "@/components/ui/card";

export function AccessRestricted() {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">
          Cette section est réservée au propriétaire et aux managers de l&apos;établissement.
        </p>
      </CardContent>
    </Card>
  );
}
