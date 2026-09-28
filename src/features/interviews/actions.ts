"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getAIProvider } from "@/lib/ai/get-ai-provider";
import { getInterviewDetail, getLinkedEmailsForApplication, tryParseInterviewDate } from "./queries";
import { buildInterviewPrepInput } from "./prep";
import { inferInterviewType } from "@/lib/interviews/interview-signal";
import type { ExtractedEmailData } from "@/lib/ai/types";

export type ScheduleInterviewResult =
  | { status: "success"; interviewId: string }
  | { status: "error"; message: string };

export async function scheduleInterviewAction(formData: FormData): Promise<ScheduleInterviewResult> {
  const user = await getCurrentUser();

  const applicationId = String(formData.get("applicationId") ?? "");
  // Ownership check up front — the Interview.applicationId FK alone
  // doesn't enforce that the application belongs to this user.
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
  });
  if (!application) {
    return { status: "error", message: "Application not found." };
  }

  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "").trim();
  let scheduledAt: Date | null = null;
  if (scheduledAtRaw) {
    scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return { status: "error", message: "That date doesn't look valid." };
    }
  }

  const interview = await prisma.interview.create({
    data: {
      userId: user.id,
      applicationId,
      type: String(formData.get("type") ?? "").trim() || null,
      scheduledAt,
      location: String(formData.get("location") ?? "").trim() || null,
    },
  });

  revalidatePath("/interviews");
  revalidatePath("/applications");
  return { status: "success", interviewId: interview.id };
}

export type GeneratePrepResult = { status: "success" } | { status: "error"; message: string };

export async function generateInterviewPrepAction(interviewId: string): Promise<GeneratePrepResult> {
  const user = await getCurrentUser();

  const interview = await getInterviewDetail(user.id, interviewId);
  if (!interview) {
    return { status: "error", message: "Interview not found." };
  }

  const linkedEmails = await getLinkedEmailsForApplication(user.id, interview.application.jobId);
  const priorNotes = interview.application.interviews
    .filter((i) => i.id !== interview.id)
    .map((i) => ({ type: i.type, notes: i.notes! }));

  const { jobDescription, role } = buildInterviewPrepInput({
    role: interview.application.job.role,
    company: interview.application.job.company,
    jobDescription: interview.application.job.description,
    interviewType: interview.type,
    previousCommunication: linkedEmails.map((e) => ({
      subject: e.subject,
      summary: e.aiSummary ?? e.snippet,
      receivedAt: e.receivedAt,
    })),
    priorInterviewNotes: priorNotes,
  });

  let prepText: string;
  try {
    prepText = await getAIProvider().generateInterviewPrep({ jobDescription, role });
  } catch (err) {
    console.error("[generateInterviewPrepAction] provider call failed:", (err as Error).message);
    return { status: "error", message: "Couldn't reach the AI provider. Check Settings." };
  }

  const result = await prisma.interview.updateMany({
    where: { id: interviewId, userId: user.id },
    data: { prepNotes: prepText },
  });
  if (result.count === 0) {
    return { status: "error", message: "Interview not found." };
  }

  revalidatePath(`/interviews/${interviewId}`);
  return { status: "success" };
}

export type ConfirmInterviewSuggestionResult =
  | { status: "success"; interviewId: string }
  | { status: "error"; message: string };

/** Confirms an interview-invite suggestion (getInterviewSuggestions,
 * ./queries.ts) into a real Interview. Never runs automatically; this is
 * the explicit-click boundary Rule 6 requires — unlike Jobs/Applications
 * auto-populating from email, a wrong auto-created interview round would
 * be actively misleading, not just informational, so this one stays
 * confirm-gated. */
export async function confirmInterviewSuggestionAction(
  emailId: string,
  applicationId: string
): Promise<ConfirmInterviewSuggestionResult> {
  const user = await getCurrentUser();

  const email = await prisma.email.findFirst({ where: { id: emailId, userId: user.id } });
  if (!email) return { status: "error", message: "Email not found." };

  const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id } });
  if (!application) return { status: "error", message: "Application not found." };

  const data = email.extractedData as ExtractedEmailData | null;
  const scheduledAt = tryParseInterviewDate(data?.interviewDate);
  const type = inferInterviewType(email.subject);

  const interview = await prisma.interview.create({
    data: { userId: user.id, applicationId, scheduledAt, type, sourceEmailId: emailId },
  });
  await prisma.email.update({ where: { id: emailId }, data: { interviewSuggestionDismissed: true } });

  revalidatePath("/interviews");
  revalidatePath("/applications");
  return { status: "success", interviewId: interview.id };
}

export type DismissInterviewSuggestionResult = { status: "success" } | { status: "error"; message: string };

export async function dismissInterviewSuggestionAction(emailId: string): Promise<DismissInterviewSuggestionResult> {
  const user = await getCurrentUser();

  const result = await prisma.email.updateMany({
    where: { id: emailId, userId: user.id },
    data: { interviewSuggestionDismissed: true },
  });
  if (result.count === 0) return { status: "error", message: "Email not found." };

  revalidatePath("/interviews");
  return { status: "success" };
}

export type UpdateNotesResult = { status: "success" } | { status: "error"; message: string };

export async function updateInterviewNotes(
  interviewId: string,
  input: { notes: string | null; completed: boolean }
): Promise<UpdateNotesResult> {
  const user = await getCurrentUser();

  const result = await prisma.interview.updateMany({
    where: { id: interviewId, userId: user.id },
    data: { notes: input.notes, completed: input.completed },
  });
  if (result.count === 0) {
    return { status: "error", message: "Interview not found." };
  }

  revalidatePath(`/interviews/${interviewId}`);
  revalidatePath("/interviews");
  return { status: "success" };
}
