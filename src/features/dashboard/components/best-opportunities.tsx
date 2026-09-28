import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { MatchBadge } from "@/components/shared/match-badge";
import type { getTopMatches } from "../queries";

export function BestOpportunities({
  matches,
}: {
  matches: Awaited<ReturnType<typeof getTopMatches>>;
}) {
  return (
    <div>
      <div className="mb-2.5 text-[13px] font-semibold">Best Opportunities Today</div>
      {matches.length === 0 ? (
        <EmptyState
          title="No job matches yet"
          description="Once jobs are discovered and matched against your profile, your best opportunities show up here."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/jobs/${m.jobId}`}
              className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface-1 px-4 py-3.5 hover:border-line-strong"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[13.5px] font-semibold">{m.job.role}</div>
                  <div className="mt-0.5 text-xs text-text2">{m.job.company}</div>
                </div>
                <div className="text-right">
                  <MatchBadge score={m.overallScore} className="text-base" breakdown={m} />
                  <div className="text-[9.5px] text-text3">match</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.matchedSkills.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="rounded bg-success-dim px-1.5 py-0.5 text-[10.5px] text-success"
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
