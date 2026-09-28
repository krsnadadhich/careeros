import type { AIProvider } from "@/lib/ai/types";
import { scoreJobWithLaya } from "@/lib/laya/score-job";
import { meetsConfidence } from "@/lib/laya/confidence";
import { computeSkillsScore } from "./skills";
import { computeLocationScore, type LocationLabel } from "./location";
import { computeOverallScore } from "./weights";

export interface JobMatchComputation {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  roleScore: number;
  locationScore: number;
  locationLabel: LocationLabel;
  matchedSkills: string[];
  missingSkills: string[];
  requiredSkills: string[];
  rationale: string;
}

export interface ComputeMatchForJobInput {
  job: { role: string; company: string; location: string | null; remote: boolean; description: string | null };
  profile: { skills: string[]; targetLocations: string[] };
  resumeText: string;
  ai: AIProvider;
}

/** Per-job scoring. Takes `ai` as an explicit parameter rather than
 * calling getAIProvider() internally so this stays unit-testable with a
 * fake provider — no env vars, no network, no DB. */
export async function computeMatchForJob({
  job,
  profile,
  resumeText,
  ai,
}: ComputeMatchForJobInput): Promise<JobMatchComputation> {
  const jobText = `${job.role}\n${job.description ?? ""}`;
  const { skillsScore, matchedSkills, missingSkills } = computeSkillsScore(profile.skills, jobText);
  const { locationScore, label: locationLabel } = computeLocationScore({
    job,
    targetLocations: profile.targetLocations,
  });

  const jobDescription = `${job.role} at ${job.company}\n\n${job.description ?? ""}`;

  let experienceScore = 50;
  let roleScore = 50;
  let rationale = "AI evaluation wasn't available for this job, so only skills and location were scored.";

  const laya = await scoreJobWithLaya({ resumeText, jobDescription });
  if (laya && meetsConfidence(laya.confidences)) {
    experienceScore = laya.result.experienceScore;
    roleScore = laya.result.roleScore;
    rationale = laya.result.rationale;
  } else {
    try {
      const result = await ai.matchJob({ resumeText, jobDescription });
      // Only the LLM's nuanced judgment is trusted — skillsScore/matchedSkills/
      // missingSkills are discarded in favor of the deterministic computation
      // above (see Phase 5 plan: don't hand a trivial, finite-list keyword
      // check to a model prone to unreliable array output).
      experienceScore = result.experienceScore;
      roleScore = result.roleScore;
      rationale = result.rationale;
    } catch (err) {
      console.warn("[matching] AI matchJob failed, using neutral fallback:", (err as Error).message);
    }
  }

  const overallScore = computeOverallScore({ skillsScore, experienceScore, roleScore, locationScore });

  // Ollama-only (no Laya branch — see extractJobSkills' doc comment);
  // never blocks the match itself on failure.
  let requiredSkills: string[] = [];
  try {
    requiredSkills = await ai.extractJobSkills({ jobDescription });
  } catch (err) {
    console.warn("[matching] extractJobSkills failed, skipping for this job:", (err as Error).message);
  }

  return {
    overallScore,
    skillsScore,
    experienceScore,
    roleScore,
    locationScore,
    locationLabel,
    matchedSkills,
    missingSkills,
    requiredSkills,
    rationale: `${rationale} Location: ${locationLabel}.`,
  };
}
