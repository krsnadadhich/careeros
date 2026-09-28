import { EmptyState } from "@/components/shared/empty-state";
import type { SkillFrequency } from "@/lib/skills";

export function SkillFrequencyList({ skills }: { skills: SkillFrequency[] }) {
  if (skills.length === 0) {
    return (
      <EmptyState
        title="No skill data yet"
        description="Once you have job matches, this shows how often each of your resume skills actually comes up across the roles you're targeting."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {skills.map((s) => (
        <div key={s.skill}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium text-text2">{s.skill}</span>
            <span className="text-text3">
              {s.matchedCount}/{s.totalCount} of your matched roles · {s.relevance}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand" style={{ width: `${s.relevance}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
