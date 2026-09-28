export interface MatchOutcomeInput {
  overallScore: number;
  reachedInterview: boolean;
}

export interface MatchOutcomeBreakdown {
  interviewedAvg: number | null;
  notInterviewedAvg: number | null;
  interviewedCount: number;
  notInterviewedCount: number;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}

/** Compares average match score between applications that reached an
 * interview and those that didn't — a direct check on whether Phase 5's
 * matching engine actually correlates with real outcomes. Each average
 * is null (not 0) when its bucket is empty, so the UI never fabricates
 * a comparison out of missing data. */
export function computeMatchScoreByOutcome(inputs: MatchOutcomeInput[]): MatchOutcomeBreakdown {
  const interviewed = inputs.filter((i) => i.reachedInterview).map((i) => i.overallScore);
  const notInterviewed = inputs.filter((i) => !i.reachedInterview).map((i) => i.overallScore);

  return {
    interviewedAvg: average(interviewed),
    notInterviewedAvg: average(notInterviewed),
    interviewedCount: interviewed.length,
    notInterviewedCount: notInterviewed.length,
  };
}
