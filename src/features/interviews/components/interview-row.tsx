import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import type { InterviewWithApplication } from "../queries";

export function InterviewRow({ interview }: { interview: InterviewWithApplication }) {
  return (
    <Link
      href={`/interviews/${interview.id}`}
      className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-4 py-3 hover:border-line-strong"
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13.5px] font-semibold">{interview.application.job.role}</span>
          <span className="text-xs text-text2">{interview.application.job.company}</span>
        </div>
        <div className="mt-0.5 text-[11.5px] text-text3">
          {interview.type ?? "Round"}
          {interview.completed && " · Completed"}
        </div>
      </div>
      <div className="flex-none text-xs text-text3">
        {interview.scheduledAt ? formatDateTime(interview.scheduledAt) : "Not yet scheduled"}
      </div>
    </Link>
  );
}
