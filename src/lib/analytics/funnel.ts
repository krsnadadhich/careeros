export interface FunnelStageCount {
  label: string;
  count: number;
}

export interface FunnelStage extends FunnelStageCount {
  pct: number;
}

/** Turns raw stage counts into percentages of the first stage — pure,
 * no DB access. The three stages this phase actually tracks (Applied /
 * Interviewed / Offer) are each backed by an unambiguous, real artifact
 * (Application.appliedAt, an existing Interview row, ApplicationStatus
 * "OFFER") rather than an inferred "reached this stage" guess — this app
 * has no status-history log, so anything finer-grained (e.g. "reached
 * screening") would have to be guessed from current status alone and
 * silently misclassify applications rejected after screening. Honest
 * beats granular here. */
export function computeFunnelStages(counts: FunnelStageCount[]): FunnelStage[] {
  const base = counts[0]?.count ?? 0;
  return counts.map((stage) => ({
    ...stage,
    pct: base === 0 ? 0 : Math.round((stage.count / base) * 100),
  }));
}
