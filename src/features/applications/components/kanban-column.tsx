"use client";

import type { ApplicationStatus } from "@prisma/client";
import { ApplicationCard, type ApplicationWithJob } from "./application-card";

export const STAGE_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  TECHNICAL: "Technical",
  HR: "HR",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export function KanbanColumn({
  stage,
  items,
  onDragStart,
  onDrop,
}: {
  stage: ApplicationStatus;
  items: ApplicationWithJob[];
  onDragStart: (id: string) => void;
  onDrop: (stage: ApplicationStatus) => void;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(stage)}
      className="flex w-54 flex-none flex-col gap-2"
    >
      <div className="flex items-baseline justify-between px-1">
        <span className="text-xs font-semibold text-text2">{STAGE_LABEL[stage]}</span>
        <span className="font-mono text-[11px] text-text3">{items.length}</span>
      </div>
      <div className="flex min-h-10 flex-col gap-2">
        {items.map((app) => (
          <ApplicationCard key={app.id} application={app} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
}
