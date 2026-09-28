import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { getAttentionItems } from "../queries";

export function NeedsAttention({
  items,
}: {
  items: Awaited<ReturnType<typeof getAttentionItems>>;
}) {
  return (
    <div>
      <div className="mb-2.5 text-[13px] font-semibold">Needs Your Attention</div>
      {items.length === 0 ? (
        <EmptyState
          title="Nothing needs your attention yet"
          description="Connect Gmail to start tracking your job search — action items will show up here."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface-1">
          {items.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
            >
              <div className="size-1.5 flex-none rounded-full bg-warning" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">{t.title}</div>
                {t.description && (
                  <div className="mt-0.5 text-[12.5px] text-text2">{t.description}</div>
                )}
              </div>
              {t.dueAt && (
                <div className="flex-none text-[11px] text-text3">
                  {formatDate(t.dueAt)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
