import Link from "next/link";
import type { Job, JobMatch, Application } from "@prisma/client";
import { MatchBadge } from "@/components/shared/match-badge";
import { GenerateBriefButton } from "./generate-brief-button";
import { CopyBriefButton } from "./copy-brief-button";
import { MarkAsAppliedButton } from "@/features/applications/components/mark-as-applied-button";
import { formatDate } from "@/lib/utils";
import { MATCH_WEIGHTS } from "@/lib/matching";
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

type JobWithRelations = Job & {
  match: JobMatch | null;
  applications: Application[];
  emails: { id: string; subject: string; receivedAt: Date | null; extractedData: unknown }[];
};

export function JobDetail({ job }: { job: JobWithRelations }) {
  const match = job.match;

  const linkedEmailSalary = job.emails.map((e) => extractSalaryString(e.extractedData)).find((s) => s !== null) ?? null;
  const signals: QualitySignal[] = [
    freshnessSignal(job),
    salaryTransparencySignal(job, linkedEmailSalary),
    ...(match
      ? [
          skillsMatchSignal(match.skillsScore),
          experienceMatchSignal(match.experienceScore),
          match.locationLabel ? locationMatchSignal(match.locationLabel) : null,
        ]
      : []),
  ].filter((s): s is QualitySignal => s !== null);

  return (
    <div className="mx-auto max-w-[860px] px-8 py-6 pb-16">
      <Link href="/jobs" className="mb-3.5 inline-block text-xs text-text3 hover:text-text2">
        ← Back to Jobs
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="text-xl font-semibold">{job.role}</div>
          <div className="mt-0.5 text-sm text-text2">
            {job.company}
            {job.location && ` · ${job.location}`}
            {job.salaryMin && job.salaryMax && ` · ${job.currency} ${job.salaryMin}–${job.salaryMax}`}
          </div>
          <div className="mt-2.5">
            {job.applications.length > 0 ? (
              <span className="text-xs text-success">✓ Tracking this application</span>
            ) : (
              <MarkAsAppliedButton jobId={job.id} />
            )}
          </div>
        </div>
        <div className="text-right">
          <MatchBadge score={match?.overallScore ?? 0} className="text-2xl" />
          <div className="text-[10.5px] text-text3">match</div>
        </div>
      </div>

      <div className="mt-3">
        <JobQualitySignals signals={signals} />
      </div>

      {match && (
        <div className="mt-6 grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-line bg-surface-1 px-3.5 py-3">
            <div className="text-[11px] text-text3">Skills ({Math.round(MATCH_WEIGHTS.skills * 100)}%)</div>
            <div className="mt-1 font-mono text-[17px] font-semibold">{match.skillsScore}%</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${match.skillsScore}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface-1 px-3.5 py-3">
            <div className="text-[11px] text-text3">Experience ({Math.round(MATCH_WEIGHTS.experience * 100)}%)</div>
            <div className="mt-1 font-mono text-[17px] font-semibold">{match.experienceScore}%</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${match.experienceScore}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface-1 px-3.5 py-3">
            <div className="text-[11px] text-text3">Role relevance ({Math.round(MATCH_WEIGHTS.role * 100)}%)</div>
            <div className="mt-1 font-mono text-[17px] font-semibold">{match.roleScore}%</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${match.roleScore}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface-1 px-3.5 py-3">
            <div className="text-[11px] text-text3">Location ({Math.round(MATCH_WEIGHTS.location * 100)}%)</div>
            <div className="mt-1 font-mono text-[17px] font-semibold">{match.locationScore}%</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${match.locationScore}%` }} />
            </div>
          </div>
        </div>
      )}

      {match && (
        <p className="mt-2 text-[11px] text-text3">
          Overall score is this weighted blend — skills matter most, location least.
        </p>
      )}

      {match?.rationale && (
        <div className="mt-5.5">
          <div className="mb-2 text-[13px] font-semibold">Why this matches you</div>
          <div className="text-[13px] leading-relaxed text-text2">{match.rationale}</div>
        </div>
      )}

      {match && (match.matchedSkills.length > 0 || match.missingSkills.length > 0) && (
        <div className="mt-5 flex gap-6">
          <div className="flex-1">
            <div className="mb-2 text-xs font-semibold text-text2">Matching Skills</div>
            <div className="flex flex-col gap-1.5">
              {match.matchedSkills.map((s) => (
                <div key={s} className="text-[12.5px] text-success">
                  ✓ {s}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-2 text-xs font-semibold text-text2">Skill Gaps</div>
            <div className="flex flex-col gap-1.5">
              {match.missingSkills.map((s) => (
                <div key={s} className="text-[12.5px] text-warning">
                  ⚠ {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {match && match.requiredSkills.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold text-text2">
            All Required Skills ({match.requiredSkills.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {match.requiredSkills.map((s) => {
              const have = match.matchedSkills.some((m) => m.toLowerCase() === s.toLowerCase());
              return (
                <span
                  key={s}
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    have ? "bg-success-dim text-success" : "bg-surface-2 text-text3"
                  }`}
                >
                  {s}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {job.sourceUrl && (
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3.5 inline-block text-xs text-brand hover:underline"
        >
          View original posting →
        </a>
      )}

      {job.description && (
        <div className="mt-5.5">
          <div className="mb-2 text-[13px] font-semibold">Job Description</div>
          <div className="rounded-lg border border-line bg-surface-1 px-4 py-3.5 text-[13px] leading-relaxed text-text2">
            {job.description}
          </div>
        </div>
      )}

      {job.emails.length > 0 && (
        <div className="mt-5.5">
          <div className="mb-2 text-[13px] font-semibold">
            Found in {job.emails.length === 1 ? "this email" : "these emails"}
          </div>
          <div className="flex flex-col gap-1.5">
            {job.emails.map((email) => (
              <Link
                key={email.id}
                href={`/inbox/${email.id}`}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-3.5 py-2.5 text-[12.5px] hover:border-line-strong"
              >
                <span className="truncate">{email.subject}</span>
                <span className="flex-none pl-3 text-[11px] text-text3">
                  {email.receivedAt ? formatDate(email.receivedAt) : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5.5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-semibold">Application Brief</div>
          <div className="flex gap-2">
            {job.applicationBrief && (
              <CopyBriefButton
                role={job.role}
                company={job.company}
                sourceUrl={job.sourceUrl}
                brief={job.applicationBrief}
              />
            )}
            <GenerateBriefButton jobId={job.id} hasBrief={Boolean(job.applicationBrief)} />
          </div>
        </div>
        {job.applicationBrief ? (
          <div className="whitespace-pre-wrap rounded-lg border border-brand-dim bg-surface-1 px-4 py-3.5 text-[13px] leading-relaxed text-text2">
            {job.applicationBrief}
          </div>
        ) : (
          <p className="text-xs text-text3">
            Click Prepare Application to draft a tailored summary, cover letter, and answers to
            common questions from your real resume and this job&apos;s description — for you to
            review and take with you when you apply yourself.
          </p>
        )}
      </div>
    </div>
  );
}
