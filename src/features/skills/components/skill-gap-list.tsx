import { EmptyState } from "@/components/shared/empty-state";
import { tierForGapPercent, type SkillGap, type SkillGapTier } from "@/lib/skills";

const TIER_CLASS: Record<SkillGapTier, string> = {
  Critical: "bg-success-dim text-success",
  Common: "bg-warning-dim text-warning",
  Occasional: "bg-surface-2 text-text3",
};

export function SkillGapList({ gaps }: { gaps: SkillGap[] }) {
  if (gaps.length === 0) {
    return (
      <EmptyState
        title="No skill gaps found"
        description="Once your matched jobs have extracted required skills, anything they ask for that isn't on your resume shows up here."
      />
    );
  }

  const totalJobs = gaps[0]?.totalJobs ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {gaps.map((g) => {
        const pct = totalJobs === 0 ? 0 : Math.round((g.jobCount / totalJobs) * 100);
        const tier = tierForGapPercent(pct);
        return (
          <div key={g.skill}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-text2">
                {g.skill}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TIER_CLASS[tier]}`}>
                  {tier}
                </span>
              </span>
              <span className="text-text3">
                {pct}% of matched jobs ({g.jobCount}/{totalJobs})
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
