import { prisma } from "@/lib/db/prisma";
import type { CandidateProfile } from "@prisma/client";
import type { JobSearchCriteria, RawJob } from "./types";
import { normalizeRawJob, type NormalizedJob } from "./normalize";
import { adzunaSource, isAdzunaConfigured } from "./adzuna";
import { createJobsFromEmailLeads } from "./from-email";
import { matchJobsForUser } from "@/lib/matching";

export interface JobScanResult {
  status: "success" | "no_profile" | "error";
  jobsFound: number;
  jobsCreated: number;
  jobsSkipped: number;
  jobsFiltered: number;
  errors: number;
  emailJobsCreated: number;
  matchesComputed: number;
  matchesFailed: number;
  message?: string;
}

function buildSearchCriteria(profile: CandidateProfile): JobSearchCriteria {
  return {
    roles: profile.targetRoles,
    locations: profile.targetLocations,
    remoteOnly: profile.remoteOnly,
    minSalary: profile.minSalary ?? undefined,
    maxSalary: profile.maxSalary ?? undefined,
  };
}

/** Exported for unit testing (see tests/unit/jobs-scan-excluded-keywords.test.ts). */
export function matchesExcludedKeyword(job: NormalizedJob, excluded: string[]): boolean {
  if (excluded.length === 0) return false;
  const haystack = `${job.role} ${job.description ?? ""}`.toLowerCase();
  return excluded.some((keyword) => haystack.includes(keyword));
}

const EMPTY_COUNTS = {
  jobsFound: 0,
  jobsCreated: 0,
  jobsSkipped: 0,
  jobsFiltered: 0,
  errors: 0,
  emailJobsCreated: 0,
  matchesComputed: 0,
  matchesFailed: 0,
};

/** The single orchestration entry point — called from both the server
 * action and (eventually) any scheduled trigger. Never throws; always
 * returns a JobScanResult. Two independent sources feed the same
 * pipeline: an Adzuna keyword search (skipped gracefully, not a hard
 * failure, if unconfigured) and job-alert emails already sitting in the
 * user's synced inbox (always attempted — no external call, no config
 * needed). Either source running alone is a fine, honest outcome. */
export async function scanForJobs(userId: string): Promise<JobScanResult> {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile || profile.targetRoles.length === 0) {
    return {
      status: "no_profile",
      ...EMPTY_COUNTS,
      message: "Add target roles to your profile in Settings before scanning for jobs.",
    };
  }

  let jobsFound = 0;
  let created = 0;
  let skipped = 0;
  let jobsFiltered = 0;
  let errors = 0;

  if (isAdzunaConfigured()) {
    let rawJobs: RawJob[];
    try {
      rawJobs = await adzunaSource.search(buildSearchCriteria(profile));
    } catch (err) {
      console.error("[jobs/scan] search failed:", (err as Error).message);
      rawJobs = [];
      errors++;
    }

    const excluded = profile.excludedKeywords.map((k) => k.toLowerCase());
    const normalized = rawJobs
      .map(normalizeRawJob)
      .filter((job) => !profile.remoteOnly || job.remote)
      .filter((job) => !matchesExcludedKeyword(job, excluded));
    jobsFound = rawJobs.length;
    jobsFiltered = rawJobs.length - normalized.length;

    // Batch dedup check (mirrors gmail/sync.ts's known-ids pattern) — one
    // query, not one findUnique per candidate. Only ever skips or creates —
    // never updates an existing row, so `saved`/`id`/any Application.jobId
    // referencing it is untouched by a re-scan.
    const fingerprints = normalized.map((j) => j.fingerprint);
    const existingJobs =
      fingerprints.length > 0
        ? await prisma.job.findMany({
            where: { userId, fingerprint: { in: fingerprints } },
            select: { fingerprint: true },
          })
        : [];
    const knownFingerprints = new Set(existingJobs.map((e) => e.fingerprint));

    for (const job of normalized) {
      if (knownFingerprints.has(job.fingerprint)) {
        skipped++;
        continue;
      }
      try {
        await prisma.job.create({ data: { userId, ...job } });
        created++;
        knownFingerprints.add(job.fingerprint); // guard against dupes within this same batch
      } catch (err) {
        if ((err as { code?: string }).code === "P2002") {
          // Unique constraint hit concurrently — already known, not an error.
          skipped++;
          continue;
        }
        errors++;
        console.error("[jobs/scan] failed to create job:", job.role, job.company, (err as Error).message);
      }
    }
  }

  let emailJobsCreated = 0;
  try {
    const emailLeads = await createJobsFromEmailLeads(userId);
    emailJobsCreated = emailLeads.created;
  } catch (err) {
    console.error("[jobs/scan] email job-lead extraction failed:", (err as Error).message);
  }

  const matchResult = await matchJobsForUser(userId, profile);

  return {
    status: "success",
    jobsFound,
    jobsCreated: created + emailJobsCreated,
    jobsSkipped: skipped,
    jobsFiltered,
    errors,
    emailJobsCreated,
    matchesComputed: matchResult.matchesComputed,
    matchesFailed: matchResult.matchesFailed,
  };
}
