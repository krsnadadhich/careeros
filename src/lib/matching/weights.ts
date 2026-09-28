/** Weights sum to 1.0. Skills weighted highest — the one fully
 * deterministic, trustworthy signal. Experience/role weighted equally —
 * the two dimensions reserved for LLM judgment, neither more formalizable
 * than the other. Location weighted lowest — it already partially acts as
 * an upstream filter (scanForJobs excludes non-remote jobs when
 * remoteOnly is set) before a Job row even exists. */
export const MATCH_WEIGHTS = {
  skills: 0.35,
  experience: 0.25,
  role: 0.25,
  location: 0.15,
} as const;

export interface ScoreComponents {
  skillsScore: number;
  experienceScore: number;
  roleScore: number;
  locationScore: number;
}

/** A deterministic weighted blend, not a raw LLM-produced number — small
 * local models are noisy at calibrated top-level scores; this computed
 * blend is itself the "explainable" result the product spec asks for. */
export function computeOverallScore(components: ScoreComponents): number {
  return Math.round(
    components.skillsScore * MATCH_WEIGHTS.skills +
      components.experienceScore * MATCH_WEIGHTS.experience +
      components.roleScore * MATCH_WEIGHTS.role +
      components.locationScore * MATCH_WEIGHTS.location
  );
}
