import Link from "next/link";
import type { Job, JobMatch } from "@prisma/client";
import { MatchBadge } from "@/components/shared/match-badge";
import { JobQualitySignals } from "./job-quality-signals";
import {
  freshnessSignal,
  salaryTransparencySignal,
  skillsMatchSignal,
  experienceMatchSignal,
  locationMatchSignal,
  extractSalaryString,
  type QualitySignal,
} from "@/lib/jobs/quality-signals";

type JobRowData = Job & {
  match: JobMatch | null;
  emails: { extractedData: unknown }[];
};

export function JobRow({ job }: { job: JobRowData }) {
  const linkedEmailSalary = job.emails.map((e) => extractSalaryString(e.extractedData)).find((s) => s !== null) ?? null;
  const signals: QualitySignal[] = [
    freshnessSignal(job),
    salaryTransparencySignal(job, linkedEmailSalary),
    ...(job.match
      ? [
          skillsMatchSignal(job.match.skillsScore),
          experienceMatchSignal(job.match.experienceScore),
          job.match.locationLabel ? locationMatchSignal(job.match.locationLabel) : null,
        ]
      : []),
  ].filter((s): s is QualitySignal => s !== null);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3.5 rounded-lg border border-line bg-surface-1 px-4 py-3 hover:border-line-strong"
    >
      <div className="w-11 flex-none">
        <MatchBadge
          score={job.match?.overallScore ?? 0}
          className="text-[15px]"
          breakdown={job.match ?? undefined}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13.5px] font-semibold">{job.role}</span>
          <span className="text-xs text-text2">{job.company}</span>
        </div>
        <div className="mt-0.5 flex gap-2.5 text-[11.5px] text-text3">
          {job.location && <span>{job.location}</span>}
          {job.salaryMin && job.salaryMax && (
            <span>
              {job.currency} {job.salaryMin}–{job.salaryMax}
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <JobQualitySignals signals={signals} />
        </div>
      </div>
    </Link>
  );
}
