import { EmptyState } from "@/components/shared/empty-state";
import type { SourceBreakdown } from "@/lib/analytics";

const SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  INDEED: "Indeed",
  ADZUNA: "Adzuna",
  COMPANY_WEBSITE: "Company Website",
  OTHER: "Other",
};

export function SourceBreakdownTable({ breakdown }: { breakdown: SourceBreakdown[] }) {
  if (breakdown.length === 0) {
    return <EmptyState title="No applications yet" description="Response rates by source will show up here once you apply." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {breakdown.map((row) => (
        <div key={row.source}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium text-text2">{SOURCE_LABELS[row.source] ?? row.source}</span>
            <span className="text-text3">
              {row.responded}/{row.total} responded · {row.responseRate}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-success" style={{ width: `${row.responseRate}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
