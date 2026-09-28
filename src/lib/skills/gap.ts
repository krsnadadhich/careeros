import { containsSkillMention } from "@/lib/matching/skills";

export interface SkillGapMatch {
  requiredSkills: string[];
}

export interface SkillGap {
  skill: string;
  /** How many matched jobs mention this skill as required. */
  jobCount: number;
  /** How many matched jobs had any requiredSkills data to consider. */
  totalJobs: number;
}

/** Deterministic — mirrors computeSkillFrequencies' own philosophy
 * (frequency counting done in TypeScript, never handed to an LLM). A
 * "gap" is a skill that shows up in JobMatch.requiredSkills (extracted
 * per-job by the AI provider, see extractJobSkills) but doesn't match any
 * of the candidate's own profile skills — using the same token-boundary
 * comparison the matching engine already uses (containsSkillMention), so
 * casing/pluralization-only differences don't produce false gaps. Sorted
 * by jobCount descending — the skills worth learning first are the ones
 * that show up in the most roles you're targeting. */
export function computeSkillGaps(matches: SkillGapMatch[], candidateSkills: string[]): SkillGap[] {
  const totalJobs = matches.filter((m) => m.requiredSkills.length > 0).length;
  const counts = new Map<string, number>();

  for (const match of matches) {
    for (const required of match.requiredSkills) {
      const alreadyHave = candidateSkills.some((skill) => containsSkillMention(skill, required));
      if (alreadyHave) continue;

      const key = required.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([skill, jobCount]) => ({ skill, jobCount, totalJobs }))
    .sort((a, b) => b.jobCount - a.jobCount);
}

export type SkillGapTier = "Critical" | "Common" | "Occasional";

/** Percentage-of-matched-jobs thresholds, not raw rank — two skills tied
 * on jobCount should read as equally important, which a rank number
 * ("Priority 4" vs "Priority 5") would misleadingly imply otherwise. */
export function tierForGapPercent(pct: number): SkillGapTier {
  if (pct >= 50) return "Critical";
  if (pct >= 20) return "Common";
  return "Occasional";
}
