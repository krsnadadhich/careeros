import type { JobSource } from "@prisma/client";

export interface SourceApplication {
  jobId: string;
  source: JobSource;
}

export interface SourceBreakdown {
  source: JobSource;
  total: number;
  responded: number;
  responseRate: number;
}

/** Groups applications by their job's source and computes what fraction
 * got any response, given the set of jobIds already known (by the
 * caller) to have a response signal — an Interview row or a linked
 * email in a category other than JOBS/OTHER. Pure aggregation, no DB
 * access; sorted by application volume so the source you're leaning on
 * most shows first. */
export function computeResponseRateBySource(
  applications: SourceApplication[],
  respondedJobIds: ReadonlySet<string>
): SourceBreakdown[] {
  const bySource = new Map<JobSource, { total: number; responded: number }>();

  for (const app of applications) {
    const bucket = bySource.get(app.source) ?? { total: 0, responded: 0 };
    bucket.total += 1;
    if (respondedJobIds.has(app.jobId)) bucket.responded += 1;
    bySource.set(app.source, bucket);
  }

  return [...bySource.entries()]
    .map(([source, { total, responded }]) => ({
      source,
      total,
      responded,
      responseRate: total === 0 ? 0 : Math.round((responded / total) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}
