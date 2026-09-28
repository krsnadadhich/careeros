import { EmptyState } from "@/components/shared/empty-state";
import type { MatchOutcomeBreakdown } from "@/lib/analytics";

export function MatchOutcomeComparison({ data }: { data: MatchOutcomeBreakdown }) {
  if (data.interviewedAvg === null && data.notInterviewedAvg === null) {
    return (
      <EmptyState
        title="Not enough data yet"
        description="Once you have match scores and application outcomes, this compares average match score for interviewed vs. non-interviewed applications."
      />
    );
  }

  const rows = [
    { label: "Reached interview", avg: data.interviewedAvg, count: data.interviewedCount },
    { label: "Did not (yet)", avg: data.notInterviewedAvg, count: data.notInterviewedCount },
  ];

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium text-text2">
              {row.label} <span className="text-text3">({row.count})</span>
            </span>
            <span className="text-text3">{row.avg === null ? "—" : `${row.avg} avg score`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand" style={{ width: `${row.avg ?? 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
