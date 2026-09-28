import { EmptyState } from "@/components/shared/empty-state";
import { GenerateBriefButton } from "@/features/brief/components/generate-brief-button";
import type { getLatestBrief } from "../queries";

export function AiBriefCard({
  brief,
}: {
  brief: Awaited<ReturnType<typeof getLatestBrief>>;
}) {
  return (
    <div className="rounded-lg border border-brand-dim bg-surface-1 px-5 py-4.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-brand-dim px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand">
            AI BRIEF
          </span>
          <span className="text-[13px] font-semibold">Your AI Brief</span>
        </div>
        <GenerateBriefButton />
      </div>

      {!brief ? (
        <div className="mt-3">
          <EmptyState
            title="Your AI Brief will appear here"
            description="Click Refresh Brief to surface what's flagged across your emails, applications, and interviews."
          />
        </div>
      ) : brief.lines.length === 0 && brief.recommendations.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="Nothing notable today"
            description="The brief refreshed, but there's nothing new to report yet — sync Gmail or add some jobs and try again."
          />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-1.5">
            {brief.lines.map((line, i) => (
              <div key={i} className="text-[13px] leading-relaxed text-text2">
                {line}
              </div>
            ))}
          </div>
          {brief.recommendations.length > 0 && (
            <div className="mt-4 border-t border-line pt-3.5">
              <div className="mb-2 text-[11px] tracking-wide text-text3 uppercase">
                Today&apos;s Recommendations
              </div>
              {brief.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-2 py-1 text-[13px]">
                  <span className="font-mono text-[11px] text-brand">{i + 1}.</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
