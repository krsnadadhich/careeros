"use client";

import Link from "next/link";
import type { Application, Job, JobMatch } from "@prisma/client";
import { MatchBadge } from "@/components/shared/match-badge";
import { formatDate } from "@/lib/utils";
import { SuggestionBanner } from "./suggestion-banner";

export type ApplicationWithJob = Application & {
  job: Job & { match: JobMatch | null; emails: { id: string; subject: string; receivedAt: Date | null }[] };
};

const INTERVIEW_STAGE_STATUSES = ["INTERVIEW", "TECHNICAL", "HR"];

export function ApplicationCard({
  application,
  onDragStart,
}: {
  application: ApplicationWithJob;
  onDragStart: (id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(application.id)}
      className="cursor-grab rounded-lg border border-line bg-surface-1 px-3 py-2.5 active:cursor-grabbing"
    >
      <div className="text-[12.5px] font-semibold">{application.job.company}</div>
      <div className="mt-0.5 text-[11.5px] text-text2">{application.job.role}</div>
      <div className="mt-2 flex items-baseline justify-between">
        <MatchBadge
          score={application.job.match?.overallScore ?? 0}
          className="text-xs"
          breakdown={application.job.match ?? undefined}
        />
        <span className="text-[10.5px] text-text3">
          {application.appliedAt ? formatDate(application.appliedAt) : "—"}
        </span>
      </div>
      {application.nextAction && (
        <div className="mt-1.5 border-t border-line pt-1.5 text-[11px] text-text3">
          Next: {application.nextAction}
        </div>
      )}
      {application.job.emails.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-0.5 border-t border-line pt-1.5">
          {application.job.emails.slice(0, 2).map((email) => (
            <Link
              key={email.id}
              href={`/inbox/${email.id}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate text-[10.5px] text-text3 hover:text-brand hover:underline"
            >
              ✉ {email.subject}
            </Link>
          ))}
          {application.job.emails.length > 2 && (
            <span className="text-[10px] text-text3">+{application.job.emails.length - 2} more</span>
          )}
        </div>
      )}
      {INTERVIEW_STAGE_STATUSES.includes(application.status) && (
        <Link
          href={`/interviews/new?applicationId=${application.id}`}
          className="mt-1.5 block text-[11px] text-brand hover:underline"
        >
          Schedule interview →
        </Link>
      )}
      {application.suggestedStatus && (
        <SuggestionBanner
          applicationId={application.id}
          suggestedStatus={application.suggestedStatus}
          suggestedReason={application.suggestedReason}
        />
      )}
    </div>
  );
}
