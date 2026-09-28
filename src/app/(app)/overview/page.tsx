import { getCurrentUser } from "@/lib/auth/session";
import {
  getKpis,
  getAttentionItems,
  getLatestBrief,
  getTopMatches,
} from "@/features/dashboard/queries";
import { KpiStrip } from "@/features/dashboard/components/kpi-strip";
import { NeedsAttention } from "@/features/dashboard/components/needs-attention";
import { AiBriefCard } from "@/features/dashboard/components/ai-brief-card";
import { BestOpportunities } from "@/features/dashboard/components/best-opportunities";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  const firstName = (user.name ?? "there").split(" ")[0];

  const [kpis, attentionItems, brief, topMatches] = await Promise.all([
    getKpis(user.id),
    getAttentionItems(user.id),
    getLatestBrief(user.id),
    getTopMatches(user.id),
  ]);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-7 pb-16">
      <div className="text-xl font-semibold tracking-tight">Good morning, {firstName}</div>
      <div className="mt-1 text-[13px] text-text2">
        Here&apos;s what changed since your last visit — {dateStr}
      </div>

      <div className="mt-5">
        <KpiStrip kpis={kpis} />
      </div>

      <div className="mt-7">
        <NeedsAttention items={attentionItems} />
      </div>

      <div className="mt-7">
        <AiBriefCard brief={brief} />
      </div>

      <div className="mt-7">
        <BestOpportunities matches={topMatches} />
      </div>
    </div>
  );
}
