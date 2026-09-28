import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalizeForFingerprint } from "@/lib/utils";

export interface EmailLinkInput {
  userId: string;
  gmailThreadId: string | null;
  senderEmail: string | null;
  extractedCompany: string | null;
}

export interface LinkedApplication {
  id: string;
  jobId: string;
  status: ApplicationStatus;
}

/** Picks the "live" application for a job when more than one exists for
 * it (the schema allows this even though today's flow creates one) —
 * prefers a non-terminal one, else falls back to the most recent. */
async function resolveApplicationForJob(userId: string, jobId: string): Promise<LinkedApplication | null> {
  const apps = await prisma.application.findMany({
    where: { userId, jobId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, jobId: true, status: true },
  });
  if (apps.length === 0) return null;
  return apps.find((a) => a.status !== "REJECTED" && a.status !== "WITHDRAWN") ?? apps[0];
}

/** Resolves an incoming email to at most one existing Application, using a
 * short, deliberately bounded priority list. Never creates a Job or
 * Application — an email that matches nothing simply stays unlinked,
 * which is a fine, honest outcome for a single-user personal app. */
export async function findApplicationForEmail(input: EmailLinkInput): Promise<LinkedApplication | null> {
  // 1. Thread continuity — the strongest signal, no string comparison needed.
  if (input.gmailThreadId) {
    const priorEmail = await prisma.email.findFirst({
      where: { userId: input.userId, gmailThreadId: input.gmailThreadId, jobId: { not: null } },
      orderBy: { receivedAt: "desc" },
      select: { jobId: true },
    });
    if (priorEmail?.jobId) {
      const app = await resolveApplicationForJob(input.userId, priorEmail.jobId);
      if (app) return app;
    }
  }

  // 2. Company-name match — only when we have an extracted company and
  //    exactly one of the user's applications is at that company.
  if (input.extractedCompany) {
    const normalizedTarget = normalizeForFingerprint(input.extractedCompany);
    if (normalizedTarget) {
      const apps = await prisma.application.findMany({
        where: { userId: input.userId },
        select: { id: true, jobId: true, status: true, job: { select: { company: true } } },
      });
      const matches = apps.filter((a) => normalizeForFingerprint(a.job.company) === normalizedTarget);
      if (matches.length === 1) {
        const { id, jobId, status } = matches[0];
        return { id, jobId, status };
      }
      // Zero or ambiguous (>1) matches both fall through to unlinked —
      // a wrong guess is worse than none.
    }
  }

  // 3. Sender-domain fallback — only trusted if the domain resolves to a
  //    single company for this user (guards against shared ATS domains
  //    like Greenhouse/Lever without any hardcoded denylist).
  if (input.senderEmail?.includes("@")) {
    const domain = input.senderEmail.split("@")[1]?.toLowerCase();
    if (domain) {
      const priorLinked = await prisma.email.findMany({
        where: { userId: input.userId, jobId: { not: null }, senderEmail: { endsWith: `@${domain}` } },
        select: { jobId: true },
      });
      const distinctJobIds = [...new Set(priorLinked.map((e) => e.jobId).filter((id): id is string => id !== null))];
      if (distinctJobIds.length > 0) {
        const jobs = await prisma.job.findMany({
          where: { id: { in: distinctJobIds }, userId: input.userId },
          select: { id: true, company: true },
        });
        const distinctCompanies = new Set(jobs.map((j) => normalizeForFingerprint(j.company)));
        if (distinctCompanies.size === 1) {
          const app = await resolveApplicationForJob(input.userId, distinctJobIds[0]);
          if (app) return app;
        }
      }
    }
  }

  return null;
}
