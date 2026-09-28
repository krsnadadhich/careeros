import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import type { JobsFilters } from "./constants";
import { DAY_MS, FRESHNESS_WINDOW_DAYS } from "@/lib/jobs/quality-signals";

export { JOBS_TABS, type JobsTab, type JobsFilters } from "./constants";

export async function getFilteredJobs(userId: string, filters: JobsFilters) {
  const where: Prisma.JobWhereInput = { userId, sourceUrl: { not: null } };

  if (filters.remoteOnly) where.remote = true;
  if (filters.savedOnly) where.saved = true;

  // Two independent OR groups — text search and the freshness fallback —
  // must live under `where.AND`, not both write to `where.OR`, or the
  // second assignment would silently clobber the first.
  const cutoff = new Date(Date.now() - FRESHNESS_WINDOW_DAYS * DAY_MS);
  const and: Prisma.JobWhereInput[] = [
    { OR: [{ postedAt: { gte: cutoff } }, { postedAt: null, createdAt: { gte: cutoff } }] },
  ];
  if (filters.query.trim()) {
    and.push({
      OR: [
        { role: { contains: filters.query, mode: "insensitive" } },
        { company: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }
  where.AND = and;

  if (filters.tab === "High Match") {
    where.match = { overallScore: { gte: 90 } };
  } else if (filters.tab === "Recommended") {
    where.match = { overallScore: { gte: 80 } };
  }
  if (filters.minMatch > 0) {
    where.match = { ...(where.match as object), overallScore: { gte: filters.minMatch } };
  }

  const orderBy: Prisma.JobOrderByWithRelationInput =
    filters.tab === "Recently Added" ? { createdAt: "desc" } : { match: { overallScore: "desc" } };

  return prisma.job.findMany({
    where,
    orderBy,
    include: {
      match: true,
      emails: { select: { extractedData: true }, take: 1, orderBy: { receivedAt: "desc" } },
    },
    take: 100,
  });
}

export async function getJobWithMatch(userId: string, jobId: string) {
  return prisma.job.findFirst({
    where: { id: jobId, userId },
    include: {
      match: true,
      applications: true,
      emails: {
        select: { id: true, subject: true, receivedAt: true, extractedData: true },
        orderBy: { receivedAt: "desc" },
      },
    },
  });
}

/** Used only to tell the two "no jobs" empty states apart — "no target
 * roles configured yet" vs. "0 jobs match your current filters". */
export async function hasTargetRoles(userId: string): Promise<boolean> {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    select: { targetRoles: true },
  });
  return Boolean(profile && profile.targetRoles.length > 0);
}
