import { EmptyState } from "@/components/shared/empty-state";
import type { ClassificationBreakdown as ClassificationBreakdownData } from "@/lib/analytics";

export function ClassificationBreakdown({ data }: { data: ClassificationBreakdownData }) {
  if (data.totalClassified === 0) {
    return (
      <EmptyState
        title="No classified emails yet"
        description="Sync Gmail to see how many emails Laya classified directly versus how many needed the Ollama fallback."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="font-medium text-text2">Laya (direct)</span>
          <span className="text-text3">
            {data.layaCount}/{data.totalClassified} · {data.layaPct}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-brand" style={{ width: `${data.layaPct}%` }} />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="font-medium text-text2">Ollama (fallback)</span>
          <span className="text-text3">
            {data.ollamaCount}/{data.totalClassified} · {data.ollamaPct}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-text3" style={{ width: `${data.ollamaPct}%` }} />
        </div>
      </div>
      {data.avgLayaConfidence !== null && (
        <p className="text-xs text-text3">
          Average Laya confidence on emails it classified directly:{" "}
          <span className="font-mono text-text2">{data.avgLayaConfidence}</span>
        </p>
      )}
    </div>
  );
}
