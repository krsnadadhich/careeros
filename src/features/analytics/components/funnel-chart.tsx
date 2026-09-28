import type { FunnelStage } from "@/lib/analytics";

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage, i) => (
        <div key={stage.label}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium text-text2">{stage.label}</span>
            <span className="text-text3">
              {stage.count}
              {i > 0 && <span className="ml-1.5 text-text3">({stage.pct}% of applied)</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand" style={{ width: `${stage.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
