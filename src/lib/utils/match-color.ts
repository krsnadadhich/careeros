export type MatchColorToken = "brand" | "foreground" | "text2";

/**
 * Maps a 0-100 match score to a semantic token key. Thresholds mirror the
 * approved CareerOS design prototype (>=90 strong, >=80 solid, else muted).
 */
export function matchColor(score: number): MatchColorToken {
  if (score >= 90) return "brand";
  if (score >= 80) return "foreground";
  return "text2";
}
