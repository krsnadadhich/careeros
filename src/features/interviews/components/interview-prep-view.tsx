import Link from "next/link";
import type { Email } from "@prisma/client";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatDateTime } from "@/lib/utils";
import { GeneratePrepButton } from "./generate-prep-button";
import { InterviewNotesForm } from "./interview-notes-form";
import type { getInterviewDetail } from "../queries";

type LinkedEmail = Pick<Email, "id" | "subject" | "aiSummary" | "snippet" | "receivedAt" | "category">;

export function InterviewPrepView({
  interview,
  linkedEmails,
  priorRounds,
}: {
  interview: NonNullable<Awaited<ReturnType<typeof getInterviewDetail>>>;
  linkedEmails: LinkedEmail[];
  priorRounds: { id: string; type: string | null; notes: string | null }[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xl font-semibold">{interview.application.job.role}</div>
        <div className="mt-1 text-sm text-text2">
          {interview.application.job.company}
          {interview.type && ` · ${interview.type}`}
          {interview.scheduledAt && ` · ${formatDateTime(interview.scheduledAt)}`}
        </div>
        {interview.sourceEmail && (
          <Link
            href={`/inbox/${interview.sourceEmail.id}`}
            className="mt-1 inline-block text-xs text-brand hover:underline"
          >
            ✉ Confirmed from: {interview.sourceEmail.subject} →
          </Link>
        )}
      </div>

      <div>
        <div className="mb-2 text-[13px] font-semibold">Previous Communication</div>
        {linkedEmails.length === 0 ? (
          <EmptyState
            title="No linked emails yet"
            description="Emails linked to this application will show up here once Gmail sync finds them."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {linkedEmails.map((email) => (
              <Link
                key={email.id}
                href={`/inbox/${email.id}`}
                className="block rounded-lg border border-line bg-surface-1 px-3.5 py-2.5 hover:border-line-strong"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold">{email.subject}</span>
                  <span className="text-[11px] text-text3">
                    {email.receivedAt ? formatDate(email.receivedAt) : ""}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text2">{email.aiSummary ?? email.snippet}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-[13px] font-semibold">Prior Interview Notes</div>
        {priorRounds.length === 0 ? (
          <EmptyState
            title="No completed prior rounds"
            description="This is the first interview logged for this application."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {priorRounds.map((round) => (
              <div key={round.id} className="rounded-lg border border-line bg-surface-1 px-3.5 py-2.5">
                <div className="text-[12.5px] font-semibold">{round.type ?? "Round"}</div>
                <div className="mt-1 text-xs text-text2">{round.notes}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-semibold">AI Prep</div>
          <GeneratePrepButton interviewId={interview.id} />
        </div>
        {interview.prepNotes ? (
          <div className="whitespace-pre-wrap rounded-lg border border-brand-dim bg-surface-1 px-4 py-3.5 text-[13px] leading-relaxed text-text2">
            {interview.prepNotes}
          </div>
        ) : (
          <EmptyState
            title="No prep generated yet"
            description="Click Generate Prep to build a brief from this application's real context."
          />
        )}
      </div>

      <div>
        <div className="mb-2 text-[13px] font-semibold">Log This Round</div>
        <InterviewNotesForm
          interviewId={interview.id}
          initialNotes={interview.notes}
          initialCompleted={interview.completed}
        />
      </div>
    </div>
  );
}
