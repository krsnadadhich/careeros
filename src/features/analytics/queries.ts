import { prisma } from "@/lib/db/prisma";
import type { EmailCategory } from "@prisma/client";
import {
  computeFunnelStages,
  computeResponseRateBySource,
  computeAvgDaysToResponse,
  computeMatchScoreByOutcome,
  computeClassificationBreakdown,
} from "@/lib/analytics";

/** Categories that represent an employer actually responding — excludes
 * JOBS (that's just a job listing/confirmation, not a reply) and OTHER. */
const RESPONSE_CATEGORIES: EmailCategory[] = ["RECRUITERS", "INTERVIEWS", "ASSESSMENTS", "OFFERS", "REJECTION"];

export async function getAnalyticsOverview(userId: string) {
  const applications = await prisma.application.findMany({
    where: { userId },
    select: {
      id: true,
      jobId: true,
      status: true,
      appliedAt: true,
      job: { select: { source: true, match: { select: { overallScore: true } } } },
      interviews: { select: { id: true, createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  const responseEmails = await prisma.email.findMany({
    where: { userId, jobId: { not: null }, category: { in: RESPONSE_CATEGORIES } },
    select: { jobId: true, receivedAt: true },
    orderBy: { receivedAt: "asc" },
  });
  const firstResponseEmailByJob = new Map<string, Date>();
  for (const email of responseEmails) {
    if (!email.jobId || !email.receivedAt) continue;
    if (!firstResponseEmailByJob.has(email.jobId)) firstResponseEmailByJob.set(email.jobId, email.receivedAt);
  }

  const appliedApps = applications.filter((a) => a.appliedAt !== null);
  const interviewedApps = applications.filter((a) => a.interviews.length > 0);
  const offerApps = applications.filter((a) => a.status === "OFFER");

  const funnel = computeFunnelStages([
    { label: "Applied", count: appliedApps.length },
    { label: "Interviewed", count: interviewedApps.length },
    { label: "Offer", count: offerApps.length },
  ]);

  const respondedJobIds = new Set<string>([
    ...interviewedApps.map((a) => a.jobId),
    ...firstResponseEmailByJob.keys(),
  ]);
  const sourceBreakdown = computeResponseRateBySource(
    appliedApps.map((a) => ({ jobId: a.jobId, source: a.job.source })),
    respondedJobIds
  );

  const timings = appliedApps.map((a) => {
    const emailResponse = firstResponseEmailByJob.get(a.jobId) ?? null;
    const interviewResponse = a.interviews[0]?.createdAt ?? null;
    const candidates = [emailResponse, interviewResponse].filter((d): d is Date => d !== null);
    const firstResponseAt = candidates.length === 0 ? null : new Date(Math.min(...candidates.map((d) => d.getTime())));
    return { appliedAt: a.appliedAt as Date, firstResponseAt };
  });
  const avgDaysToResponse = computeAvgDaysToResponse(timings);

  const matchInputs = applications
    .filter((a) => a.job.match !== null)
    .map((a) => ({ overallScore: a.job.match!.overallScore, reachedInterview: a.interviews.length > 0 }));
  const matchByOutcome = computeMatchScoreByOutcome(matchInputs);

  const classifiedEmails = await prisma.email.findMany({
    where: { userId, classificationSource: { not: null } },
    select: { classificationSource: true, classificationConfidence: true },
  });
  const classificationBreakdown = computeClassificationBreakdown(classifiedEmails);

  return {
    totalApplications: applications.length,
    funnel,
    sourceBreakdown,
    avgDaysToResponse,
    matchByOutcome,
    classificationBreakdown,
  };
}

export type AnalyticsOverview = Awaited<ReturnType<typeof getAnalyticsOverview>>;
