"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TableNode } from "@/features/floor-plan/table-node";
import { TableFormDialog, type TableFormValues } from "@/features/floor-plan/table-form-dialog";
import { OperationControls } from "@/features/floor-plan/operation-controls";
import { moveTableAction, getTableStatusesAction } from "@/server/actions/tables";
import type { TableStatus } from "@/server/services/floor-plan";

type TableData = {
  id: string;
  name: string;
  seats: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "RECTANGLE" | "ROUND";
};

export function FloorPlanCanvas({ tables, defaultDate }: { tables: TableData[]; defaultDate: string }) {
  const [mode, setMode] = useState<"edit" | "operate">("operate");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TableFormValues | undefined>(undefined);
  const [operationTime, setOperationTime] = useState({ date: defaultDate, time: "19:00" });
  const [statuses, setStatuses] = useState<Map<string, TableStatus>>(new Map());
  const [loadingStatuses, startStatusTransition] = useTransition();

  useEffect(() => {
    if (mode !== "operate") return;
    let cancelled = false;
    startStatusTransition(async () => {
      const data = await getTableStatusesAction(operationTime);
      if (cancelled) return;
      setStatuses(new Map(data.map((s) => [s.tableId, s])));
    });
    return () => {
      cancelled = true;
    };
  }, [mode, operationTime]);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(table: TableData) {
    setEditing({
      id: table.id,
      name: table.name,
      seats: String(table.seats),
      shape: table.shape,
      x: table.x,
      y: table.y,
      width: String(table.width),
      height: String(table.height),
    });
    setDialogOpen(true);
  }

  async function handleMoveEnd(id: string, x: number, y: number) {
    await moveTableAction({ id, x, y });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={mode === "edit" ? "primary" : "outline"}
            size="sm"
            onClick={() => setMode(mode === "edit" ? "operate" : "edit")}
          >
            <Pencil className="h-4 w-4" /> {mode === "edit" ? "Terminer la modification" : "Modifier le plan"}
          </Button>
          {mode === "edit" && (
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Ajouter une table
            </Button>
          )}
        </div>

        {mode === "operate" && (
          <OperationControls
            date={operationTime.date}
            time={operationTime.time}
            onChange={setOperationTime}
          />
        )}
      </div>

      {mode === "operate" && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {loadingStatuses ? "Mise à jour des disponibilités…" : "Disponibilités à jour."}
        </p>
      )}

      <Card>
        <CardContent className="pt-5">
          {tables.length === 0 ? (
            <EmptyState
              title="Aucune table configurée."
              description="Ajoutez vos tables pour construire le plan de salle."
              action={
                <Button size="sm" onClick={() => (mode === "edit" ? openCreate() : setMode("edit"))}>
                  Ajouter une table
                </Button>
              }
            />
          ) : (
            <div className="relative h-[560px] w-full overflow-auto rounded-md border border-dashed border-border bg-muted/30">
              <div className="relative h-[900px] w-[1200px]">
                {tables.map((table) => (
                  <TableNode
                    key={table.id}
                    table={table}
                    mode={mode}
                    status={statuses.get(table.id)}
                    onClick={() => mode === "edit" && openEdit(table)}
                    onMoveEnd={(x, y) => handleMoveEnd(table.id, x, y)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TableFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initialValues={editing} />
    </div>
  );
}
