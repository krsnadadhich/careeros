import { prisma } from "@/lib/db/prisma";
import { computeJobFingerprint } from "@/lib/jobs/fingerprint";
import type { JobSource } from "@prisma/client";

export type CreateApplicationResult = { status: "success"; jobId: string } | { status: "error"; message: string };

export interface ManualJobInput {
  role: string;
  company: string;
  location: string | null;
  source: JobSource;
  sourceUrl: string | null;
}

/** Finds-or-creates the Job (deduped by the same fingerprint scanning
 * uses, so logging the same role/company/location twice updates nothing
 * rather than duplicating it) and creates an Application for it, unless
 * one already exists. Shared by manual logging and the email-derived
 * suggestion flow — every path that starts tracking a new application
 * (as opposed to "Mark as Applied" on a job already known by id) funnels
 * through the same dedup logic. */
export async function createTrackedApplication(
  userId: string,
  job: ManualJobInput,
  appliedAt: Date
): Promise<CreateApplicationResult> {
  const fingerprint = computeJobFingerprint(job.role, job.company, job.location);

  const jobRow = await prisma.job.upsert({
    where: { userId_fingerprint: { userId, fingerprint } },
    create: { userId, ...job, fingerprint },
    update: {},
  });

  const existingApplication = await prisma.application.findFirst({ where: { userId, jobId: jobRow.id } });
  if (existingApplication) {
    return { status: "error", message: "You're already tracking an application for this job." };
  }

  await prisma.application.create({
    data: { userId, jobId: jobRow.id, status: "APPLIED", appliedAt, lastActivityAt: appliedAt },
  });

  return { status: "success", jobId: jobRow.id };
}
