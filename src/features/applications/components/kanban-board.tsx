"use client";

import { useRef, useTransition } from "react";
import type { ApplicationStatus } from "@prisma/client";
import { KanbanColumn } from "./kanban-column";
import type { ApplicationWithJob } from "./application-card";
import { updateApplicationStatus } from "../actions";
import type { STAGE_ORDER } from "../queries";

export function KanbanBoard({
  columns,
}: {
  columns: { stage: (typeof STAGE_ORDER)[number]; items: ApplicationWithJob[] }[];
}) {
  const draggingId = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(stage: ApplicationStatus) {
    const id = draggingId.current;
    draggingId.current = null;
    if (!id) return;
    startTransition(async () => {
      await updateApplicationStatus(id, stage);
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {columns.map((col) => (
        <KanbanColumn
          key={col.stage}
          stage={col.stage}
          items={col.items}
          onDragStart={(id) => (draggingId.current = id)}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
