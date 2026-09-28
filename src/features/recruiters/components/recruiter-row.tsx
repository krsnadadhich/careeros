import Link from "next/link";
import { needsFollowUp } from "@/lib/recruiters";
import { formatDate } from "@/lib/utils";
import type { RecruiterWithEmails } from "../queries";

export function RecruiterRow({ recruiter }: { recruiter: RecruiterWithEmails }) {
  const flagged = needsFollowUp(recruiter, undefined, undefined, recruiter.emails[0]?.actionRequired ?? false);
  const latestEmail = recruiter.emails[0];

  return (
    <Link
      href={`/recruiters/${recruiter.id}`}
      className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-4 py-3 hover:border-line-strong"
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13.5px] font-semibold">{recruiter.name}</span>
          {recruiter.company && <span className="text-xs text-text2">{recruiter.company}</span>}
          {flagged && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              Needs follow-up
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-text3">
          {latestEmail ? latestEmail.subject : recruiter.email ?? "No email on record"}
        </div>
      </div>
      <div className="flex-none text-xs text-text3">
        {recruiter.lastContactedAt ? formatDate(recruiter.lastContactedAt) : "Never contacted"}
      </div>
    </Link>
  );
}
