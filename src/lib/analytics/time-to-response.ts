export interface ResponseTiming {
  appliedAt: Date;
  firstResponseAt: Date | null;
}

/** Average days between applying and the first real response (an
 * Interview being created, or a linked non-JOBS/OTHER email arriving).
 * Returns null — not 0 — when there's no data yet, so the UI can show an
 * honest "not enough data" state instead of a misleading zero. */
export function computeAvgDaysToResponse(timings: ResponseTiming[]): number | null {
  const days = timings
    .filter((t): t is ResponseTiming & { firstResponseAt: Date } => t.firstResponseAt !== null)
    .map((t) => Math.max(0, (t.firstResponseAt.getTime() - t.appliedAt.getTime()) / (1000 * 60 * 60 * 24)));

  if (days.length === 0) return null;
  const avg = days.reduce((sum, d) => sum + d, 0) / days.length;
  return Math.round(avg * 10) / 10;
}
