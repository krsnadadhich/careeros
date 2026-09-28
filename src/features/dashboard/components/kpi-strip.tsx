import { KpiCell } from "@/components/shared/kpi-cell";
import type { getKpis } from "../queries";

export function KpiStrip({ kpis }: { kpis: Awaited<ReturnType<typeof getKpis>> }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-line bg-surface-1">
      <KpiCell label="New Emails" value={kpis.newEmails} />
      <KpiCell label="Important" value={kpis.important} tone="warning" />
      <KpiCell label="New Jobs" value={kpis.newJobs} />
      <KpiCell label="Strong Matches" value={kpis.strongMatches} tone="brand" />
      <KpiCell label="Applications" value={kpis.applications} />
      <KpiCell label="Interviews" value={kpis.interviews} tone="success" />
    </div>
  );
}
