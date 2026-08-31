import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  subvalue,
}: {
  title: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {subvalue && <p className="text-xs text-muted-foreground">{subvalue}</p>}
      </CardContent>
    </Card>
  );
}

export function OccupancyCard({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>Occupation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{clamped}%</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${clamped}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}
