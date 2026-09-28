import type { QualitySignal } from "@/lib/jobs/quality-signals";

const TONE_CLASS: Record<QualitySignal["tone"], string> = {
  positive: "bg-success-dim text-success",
  neutral: "bg-warning-dim text-warning",
  muted: "bg-surface-2 text-text3",
};

export function JobQualitySignals({ signals }: { signals: QualitySignal[] }) {
  if (signals.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {signals.map((s) => (
        <span key={s.label} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[s.tone]}`}>
          {s.label}
        </span>
      ))}
    </div>
  );
}
