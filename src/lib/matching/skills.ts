function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whether `skill` appears in `haystack` as a whole token, not a substring
 * of a larger word. Deliberately does NOT use `\b` word-boundary regex —
 * `\b` is defined on word/non-word transitions, which breaks for symbol-
 * containing skills like "C++" or "Node.js" (a trailing "+" is itself a
 * non-word character, so `\bC\+\+\b` never finds a boundary before the
 * following space). Adjacency lookarounds against alphanumerics directly
 * avoid that, and correctly reject "Go" inside "Google" (lookahead sees a
 * letter) as well as inside "Django" (lookbehind sees a letter) — a naive
 * `\b` or bare `.includes()` each fail one of these two directions. */
export function containsSkillMention(skill: string, haystack: string): boolean {
  const trimmed = skill.trim();
  if (!trimmed) return false;
  const pattern = new RegExp(`(?<![a-zA-Z0-9])${escapeRegExp(trimmed)}(?![a-zA-Z0-9])`, "i");
  return pattern.test(haystack);
}

export interface SkillsScoreResult {
  skillsScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

/** No single job posting mentions a candidate's entire resume — dividing
 * by the candidate's full skill count made skillsScore collapse toward 0
 * for anyone with a reasonably long skills list (real data: a 20+-skill
 * profile matching 2-3 skills a job actually asks for scored 4-12%, even
 * on a job that covered everything it needed). Capping the denominator
 * treats "matched every skill this job would realistically test for" as
 * 100%, instead of requiring an implausible match against the whole
 * resume. */
const SKILLS_SCORE_CAP = 8;

/** Deterministic skills overlap — a finite, known candidate skill list
 * checked against job text. No LLM call: this is exactly the "trivial
 * calculation" the product spec says not to hand to a model, and it's
 * more explainable and reliable than freeform LLM array output. */
export function computeSkillsScore(candidateSkills: string[], jobText: string): SkillsScoreResult {
  if (candidateSkills.length === 0) {
    return { skillsScore: 0, matchedSkills: [], missingSkills: [] };
  }

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of candidateSkills) {
    if (containsSkillMention(skill, jobText)) matchedSkills.push(skill);
    else missingSkills.push(skill);
  }

  const denominator = Math.min(candidateSkills.length, SKILLS_SCORE_CAP);
  const skillsScore = Math.min(100, Math.round((matchedSkills.length / denominator) * 100));
  return { skillsScore, matchedSkills, missingSkills };
}
