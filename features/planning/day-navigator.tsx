"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDaysToDateString, todayInZone } from "@/lib/datetime";

export function DayNavigator({ date, timezone }: { date: string; timezone: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextDate);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Jour précédent" onClick={() => goTo(addDaysToDateString(date, -1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => goTo(todayInZone(timezone))}>
        Aujourd&apos;hui
      </Button>
      <Button variant="outline" size="icon" aria-label="Jour suivant" onClick={() => goTo(addDaysToDateString(date, 1))}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Input
        type="date"
        value={date}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        aria-label="Choisir une date"
        className="w-auto"
      />
    </div>
  );
}
