"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type { ApplicationStatus, JobSource } from "@prisma/client";
import { createTrackedApplication, type CreateApplicationResult } from "@/lib/applications/create";

const MANUAL_SOURCES: JobSource[] = ["LINKEDIN", "INDEED", "COMPANY_WEBSITE", "OTHER"];

export type LogApplicationResult = CreateApplicationResult;

/** Logs an application to a job the user found and applied to outside
 * CareerOS and that Gmail sync hasn't (or can't) detect on its own —
 * Gmail sync does auto-create Application rows from confirmation emails
 * (see lib/applications/auto-track.ts), this is the manual fallback for
 * anything it misses. */
export async function logApplicationAction(formData: FormData): Promise<LogApplicationResult> {
  const user = await getCurrentUser();

  const role = String(formData.get("role") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  if (!role || !company) return { status: "error", message: "Role and company are required." };

  const location = String(formData.get("location") ?? "").trim() || null;
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim() || null;
  const sourceRaw = String(formData.get("source") ?? "OTHER") as JobSource;
  const source = MANUAL_SOURCES.includes(sourceRaw) ? sourceRaw : "OTHER";

  const appliedAtRaw = String(formData.get("appliedAt") ?? "").trim();
  let appliedAt = new Date();
  if (appliedAtRaw) {
    const parsed = new Date(appliedAtRaw);
    if (!Number.isNaN(parsed.getTime())) appliedAt = parsed;
  }

  const result = await createTrackedApplication(user.id, { role, company, location, source, sourceUrl }, appliedAt);
  if (result.status === "success") {
    revalidatePath("/applications");
    revalidatePath("/overview");
  }
  return result;
}

export type TrackApplicationResult = { status: "success" } | { status: "error"; message: string };

/** Starts tracking an application for a Job already known to CareerOS
 * (found via a scan) — the "Mark as Applied" counterpart to logging one
 * manually for a job found elsewhere. */
export async function trackApplicationAction(jobId: string): Promise<TrackApplicationResult> {
  const user = await getCurrentUser();

  const job = await prisma.job.findFirst({ where: { id: jobId, userId: user.id } });
  if (!job) return { status: "error", message: "Job not found." };

  const existingApplication = await prisma.application.findFirst({ where: { userId: user.id, jobId } });
  if (existingApplication) return { status: "error", message: "Already tracking this application." };

  const appliedAt = new Date();
  await prisma.application.create({
    data: { userId: user.id, jobId, status: "APPLIED", appliedAt, lastActivityAt: appliedAt },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/applications");
  revalidatePath("/overview");
  return { status: "success" };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  const user = await getCurrentUser();

  // updateMany with a userId filter enforces ownership — a foreign
  // application id simply matches zero rows instead of leaking existence.
  const result = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id },
    data: {
      status,
      lastActivityAt: new Date(),
      // A manual move supersedes whatever an email implied — clear any
      // pending/ignored suggestion state so it doesn't linger stale.
      suggestedStatus: null,
      suggestedReason: null,
      suggestedFromEmailId: null,
      suggestedAt: null,
      lastIgnoredStatus: null,
    },
  });

  if (result.count === 0) {
    throw new Error("Application not found");
  }

  revalidatePath("/applications");
}

export async function confirmApplicationStatusSuggestion(applicationId: string) {
  const user = await getCurrentUser();

  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
    select: { suggestedStatus: true },
  });
  if (!app?.suggestedStatus) throw new Error("No pending suggestion");

  const result = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id },
    data: {
      status: app.suggestedStatus,
      lastActivityAt: new Date(),
      suggestedStatus: null,
      suggestedReason: null,
      suggestedFromEmailId: null,
      suggestedAt: null,
      lastIgnoredStatus: null,
    },
  });
  if (result.count === 0) throw new Error("Application not found");

  revalidatePath("/applications");
}

export async function ignoreApplicationStatusSuggestion(applicationId: string) {
  const user = await getCurrentUser();

  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
    select: { suggestedStatus: true },
  });
  if (!app?.suggestedStatus) throw new Error("No pending suggestion");

  const result = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id },
    data: {
      suggestedStatus: null,
      suggestedReason: null,
      suggestedFromEmailId: null,
      suggestedAt: null,
      lastIgnoredStatus: app.suggestedStatus,
    },
  });
  if (result.count === 0) throw new Error("Application not found");

  revalidatePath("/applications");
}
