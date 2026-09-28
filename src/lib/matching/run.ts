import type { CandidateProfile } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getAIProvider } from "@/lib/ai/get-ai-provider";
import { buildResumeText } from "./resume-text";
import { computeMatchForJob } from "./match-job";

const MATCH_CAP = 5;

export interface MatchRunResult {
  matchesComputed: number;
  matchesFailed: number;
}

/** Scores up to MATCH_CAP jobs lacking a JobMatch — not scoped to jobs
 * created in this run; also picks up any pre-existing unmatched Job (from
 * before this phase existed, or a prior failed attempt). Each match is a
 * full local-LLM completion (several real seconds), so this stays tightly
 * bounded — tighter than Adzuna's own per-scan call cap — since it
 * directly extends how long the "Scan for Jobs" button spins with no
 * background queue in this phase. Never throws — mirrors syncNewMessages'
 * "always returns a result" contract. */
export async function matchJobsForUser(userId: string, profile: CandidateProfile): Promise<MatchRunResult> {
  try {
    const jobsNeedingMatch = await prisma.job.findMany({
      where: { userId, match: null },
      orderBy: { createdAt: "desc" },
      take: MATCH_CAP,
    });

    if (jobsNeedingMatch.length === 0) {
      return { matchesComputed: 0, matchesFailed: 0 };
    }

    const primaryResume = await prisma.resume.findFirst({
      where: { userId, isPrimary: true },
      orderBy: { createdAt: "desc" },
    });
    const resumeText = buildResumeText({ resume: primaryResume, profile });
    const ai = getAIProvider();

    let computed = 0;
    let failed = 0;

    for (const job of jobsNeedingMatch) {
      try {
        const match = await computeMatchForJob({ job, profile, resumeText, ai });
        await prisma.jobMatch.upsert({
          where: { jobId: job.id },
          create: { userId, jobId: job.id, ...match },
          update: match,
        });
        computed++;
      } catch (err) {
        failed++;
        console.error("[matching] failed to compute match for job:", job.id, job.role, (err as Error).message);
      }
    }

    return { matchesComputed: computed, matchesFailed: failed };
  } catch (err) {
    console.error("[matching] match run failed:", (err as Error).message);
    return { matchesComputed: 0, matchesFailed: 0 };
  }
}
