import Link from "next/link";
import type { Email } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";
import { PRIORITY_ICON } from "./email-row";

const EXTRACTED_FIELD_LABELS: Record<string, string> = {
  company: "Company",
  role: "Role",
  applicationStage: "Application stage",
  interviewDate: "Interview date",
  assessmentDeadline: "Assessment deadline",
  recruiterName: "Recruiter",
  recruiterEmail: "Recruiter email",
  location: "Location",
  salary: "Salary",
};

function renderExtractedData(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const entries = Object.entries(data as Record<string, unknown>).filter(
    ([key, value]) => key in EXTRACTED_FIELD_LABELS && value != null && value !== ""
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-5.5">
      <div className="mb-2 text-[13px] font-semibold">Extracted Details</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-line bg-surface-1 px-4 py-3.5">
        {entries.map(([key, value]) => (
          <div key={key} className="text-[12.5px]">
            <span className="text-text3">{EXTRACTED_FIELD_LABELS[key]}: </span>
            <span className="text-text2">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmailDetail({ email }: { email: Email }) {
  return (
    <div className="mx-auto max-w-[760px] px-8 py-6 pb-16">
      <Link href="/inbox" className="mb-3.5 inline-block text-xs text-text3 hover:text-text2">
        ← Back to Inbox
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span>{PRIORITY_ICON[email.priority]}</span>
            <span className="text-lg font-semibold">{email.subject}</span>
          </div>
          <div className="mt-1 text-sm text-text2">
            {email.sender}
            {email.senderEmail && ` <${email.senderEmail}>`}
          </div>
        </div>
        <div className="flex-none text-right text-xs text-text3">
          {email.receivedAt ? formatDateTime(email.receivedAt) : ""}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="rounded border border-line px-1.5 py-0.5 text-[10.5px] text-text3">
          {email.category}
        </span>
        {email.actionRequired && (
          <span className="rounded border border-warning-dim bg-warning-dim px-1.5 py-0.5 text-[10.5px] text-warning">
            Action required
          </span>
        )}
        {email.importanceScore != null && (
          <span className="font-mono text-[10.5px] text-text3">
            importance {email.importanceScore}
          </span>
        )}
      </div>

      {email.aiSummary && (
        <div className="mt-5.5 rounded-lg border border-brand-dim bg-surface-1 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-dim px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand">
              AI
            </span>
            <span className="text-[13px] font-semibold">Summary</span>
          </div>
          <div className="mt-2 text-[13px] leading-relaxed text-text2">{email.aiSummary}</div>
        </div>
      )}

      {renderExtractedData(email.extractedData)}

      <div className="mt-5.5">
        <div className="mb-2 text-[13px] font-semibold">Message</div>
        <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface-1 px-4 py-3.5 text-[13px] leading-relaxed text-text2">
          {email.bodyText || email.snippet || "No content available."}
        </div>
      </div>

      {email.gmailThreadId && (
        <a
          href={`https://mail.google.com/mail/u/0/#all/${email.gmailThreadId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-xs text-brand hover:underline"
        >
          Open in Gmail →
        </a>
      )}
    </div>
  );
}
