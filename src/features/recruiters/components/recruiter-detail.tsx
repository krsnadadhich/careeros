import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { needsFollowUp } from "@/lib/recruiters";
import { classifyTimelineStage } from "@/lib/recruiters/timeline-signal";
import { formatDate } from "@/lib/utils";
import { MarkContactedButton } from "./mark-contacted-button";
import { RecruiterNotesForm } from "./recruiter-notes-form";
import type { RecruiterWithEmails } from "../queries";

export function RecruiterDetail({ recruiter }: { recruiter: RecruiterWithEmails }) {
  // emails are fetched most-recent-first (needed below for the follow-up
  // check, which must look at the LATEST email) — the timeline reads
  // top-to-bottom as "what happened, in order", so it gets its own
  // oldest-first copy rather than changing the underlying query order.
  const flagged = needsFollowUp(recruiter, undefined, undefined, recruiter.emails[0]?.actionRequired ?? false);
  const timeline = [...recruiter.emails].reverse();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold">{recruiter.name}</div>
          {flagged && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              Needs follow-up
            </span>
          )}
        </div>
        <div className="mt-1 text-sm text-text2">
          {recruiter.company ?? "Company unknown"}
          {recruiter.email && ` · ${recruiter.email}`}
        </div>
        <div className="mt-1 text-xs text-text3">
          {recruiter.lastContactedAt
            ? `Last contact: ${formatDate(recruiter.lastContactedAt)}`
            : "No contact logged yet"}
        </div>
      </div>

      <div>
        <MarkContactedButton recruiterId={recruiter.id} />
      </div>

      <div>
        <div className="mb-2 text-[13px] font-semibold">Timeline</div>
        {timeline.length === 0 ? (
          <EmptyState
            title="No linked emails yet"
            description="Emails from this recruiter will show up here once Gmail sync finds them."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {timeline.map((email) => {
              const stage = classifyTimelineStage({ category: email.category, subject: email.subject });
              return (
                <Link
                  key={email.id}
                  href={`/inbox/${email.id}`}
                  className="block rounded-lg border border-line bg-surface-1 px-3.5 py-2.5 hover:border-line-strong"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="rounded-full bg-brand-dim px-1.5 py-0.5 text-[10px] font-medium text-brand">
                        {stage}
                      </span>
                      <span className="text-[13px] font-semibold">{email.subject}</span>
                    </span>
                    <span className="text-[11px] text-text3">{email.receivedAt ? formatDate(email.receivedAt) : ""}</span>
                  </div>
                  {email.job && (
                    <div className="mt-0.5 text-[11px] text-text3">
                      {email.job.role} · {email.job.company}
                    </div>
                  )}
                  {email.aiSummary && <div className="mt-1 text-xs text-text2">{email.aiSummary}</div>}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <RecruiterNotesForm recruiterId={recruiter.id} initialNotes={recruiter.notes} />
      </div>
    </div>
  );
}
