"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export function OperationControls({
  date,
  time,
  onChange,
}: {
  date: string;
  time: string;
  onChange: (next: { date: string; time: string }) => void;
}) {
  return (
    <div className="flex items-end gap-3">
      <Field label="Date" htmlFor="op-date">
        <Input id="op-date" type="date" value={date} onChange={(e) => onChange({ date: e.target.value, time })} />
      </Field>
      <Field label="Heure" htmlFor="op-time">
        <Input id="op-time" type="time" value={time} onChange={(e) => onChange({ date, time: e.target.value })} />
      </Field>
    </div>
  );
}
