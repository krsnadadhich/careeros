import { getCurrentUser } from "@/lib/auth/session";
import { getAnalyticsOverview } from "@/features/analytics/queries";
import { FunnelChart } from "@/features/analytics/components/funnel-chart";
import { SourceBreakdownTable } from "@/features/analytics/components/source-breakdown-table";
import { MatchOutcomeComparison } from "@/features/analytics/components/match-outcome-comparison";
import { ClassificationBreakdown } from "@/features/analytics/components/classification-breakdown";
import { KpiCell } from "@/components/shared/kpi-cell";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const data = await getAnalyticsOverview(user.id);

  return (
    <div className="mx-auto max-w-[900px] px-8 py-6 pb-16">
      <div className="mb-5 text-lg font-semibold">Analytics</div>

      <div className="mb-7 flex overflow-hidden rounded-lg border border-line bg-surface-1">
        <KpiCell label="Total Applications" value={data.totalApplications} />
        <KpiCell label="Applied" value={data.funnel[0]?.count ?? 0} />
        <KpiCell label="Interviewed" value={data.funnel[1]?.count ?? 0} tone="brand" />
        <KpiCell label="Offers" value={data.funnel[2]?.count ?? 0} tone="success" />
        <KpiCell
          label="Avg. Days to Response"
          value={data.avgDaysToResponse === null ? "—" : data.avgDaysToResponse}
        />
      </div>

      <div className="flex flex-col gap-8">
        <section>
          <div className="mb-3 text-[13px] font-semibold">Application Funnel</div>
          <FunnelChart stages={data.funnel} />
        </section>

        <section>
          <div className="mb-3 text-[13px] font-semibold">Response Rate by Source</div>
          <SourceBreakdownTable breakdown={data.sourceBreakdown} />
        </section>

        <section>
          <div className="mb-3 text-[13px] font-semibold">Match Score vs. Outcome</div>
          <MatchOutcomeComparison data={data.matchByOutcome} />
        </section>

        <section>
          <div className="mb-3 text-[13px] font-semibold">AI Classification (Laya vs. Ollama)</div>
          <ClassificationBreakdown data={data.classificationBreakdown} />
        </section>
      </div>
    </div>
  );
}
