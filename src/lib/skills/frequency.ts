export interface SkillMatchSignal {
  matchedSkills: string[];
  missingSkills: string[];
}

export interface SkillFrequency {
  skill: string;
  /** How many of the user's job matches mention this skill in the job text. */
  matchedCount: number;
  /** How many job matches this skill was considered against at all (it's
   * only "considered" for a job when it was in the candidate's profile at
   * match time). */
  totalCount: number;
  /** matchedCount / totalCount as a 0-100 percentage. */
  relevance: number;
}

/** Aggregates per-job matchedSkills/missingSkills (Phase 5's deterministic,
 * "candidate skill found in this job's text or not" computation) across
 * every job match into a per-skill relevance score. This is NOT a
 * "skills you're missing that jobs require" gap analysis — the matching
 * engine only ever checks the candidate's OWN resume skills against job
 * text (a deliberate Phase 5 choice: extracting a job's full required-
 * skill list is a separate, unbuilt capability), so every skill here is
 * one the candidate already has. What this honestly tells you is how
 * often each of your existing skills actually comes up across the roles
 * you're targeting — which ones to lean on, which barely register. */
export function computeSkillFrequencies(matches: SkillMatchSignal[]): SkillFrequency[] {
  const counts = new Map<string, { matched: number; total: number }>();

  for (const match of matches) {
    for (const skill of match.matchedSkills) {
      const c = counts.get(skill) ?? { matched: 0, total: 0 };
      c.matched += 1;
      c.total += 1;
      counts.set(skill, c);
    }
    for (const skill of match.missingSkills) {
      const c = counts.get(skill) ?? { matched: 0, total: 0 };
      c.total += 1;
      counts.set(skill, c);
    }
  }

  return [...counts.entries()]
    .map(([skill, { matched, total }]) => ({
      skill,
      matchedCount: matched,
      totalCount: total,
      relevance: total === 0 ? 0 : Math.round((matched / total) * 100),
    }))
    .sort((a, b) => b.totalCount - a.totalCount || b.relevance - a.relevance);
}
