"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
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

const DRAG_THRESHOLD_PX = 4;

export function TableNode({
  table,
  mode,
  status,
  onClick,
  onMoveEnd,
}: {
  table: TableData;
  mode: "edit" | "operate";
  status?: TableStatus;
  onClick: () => void;
  onMoveEnd: (x: number, y: number) => void;
}) {
  const [position, setPosition] = useState({ x: table.x, y: table.y });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number; dragged: boolean } | null>(
    null
  );

  // Keep local position in sync when the server-confirmed position changes
  // (e.g. after another edit refreshes the page) but not while dragging —
  // the standard "adjust state during render" pattern, gated on state
  // (isDragging) rather than a ref, which render must not read directly.
  if (!isDragging && (position.x !== table.x || position.y !== table.y)) {
    setPosition({ x: table.x, y: table.y });
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (mode !== "edit") return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      dragged: false,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
      dragState.current.dragged = true;
    }
    const nextX = Math.max(0, dragState.current.originX + dx);
    const nextY = Math.max(0, dragState.current.originY + dy);
    setPosition({ x: nextX, y: nextY });
  }

  function handlePointerUp() {
    if (!dragState.current) return;
    const { dragged } = dragState.current;
    dragState.current = null;
    setIsDragging(false);
    if (dragged) {
      onMoveEnd(position.x, position.y);
    } else {
      onClick();
    }
  }

  const occupied = status?.occupied ?? false;

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{ left: position.x, top: position.y, width: table.width, height: table.height }}
      className={cn(
        "absolute flex select-none flex-col items-center justify-center border-2 text-center text-xs font-medium shadow-sm transition-colors",
        table.shape === "ROUND" ? "rounded-full" : "rounded-md",
        mode === "edit" ? "cursor-grab bg-card border-border hover:border-accent active:cursor-grabbing" : "cursor-default",
        mode === "operate" && !occupied && "bg-green-50 border-green-600 text-green-900",
        mode === "operate" && occupied && "bg-red-50 border-red-600 text-red-900"
      )}
    >
      <span className="font-semibold">{table.name}</span>
      <span className="text-[10px] text-muted-foreground">{table.seats} places</span>
      {mode === "operate" && (
        <span className="mt-1 text-[10px] font-semibold">
          {occupied ? (
            <>
              Occupée
              <br />
              {status?.reservation?.customerName}
              <br />
              {status?.reservation?.startTime}–{status?.reservation?.endTime} · {status?.reservation?.partySize}p
            </>
          ) : (
            "Libre"
          )}
        </span>
      )}
    </div>
  );
}
