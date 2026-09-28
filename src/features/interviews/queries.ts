import { prisma } from "@/lib/db/prisma";
import type { Interview, Application, Job } from "@prisma/client";
import { isInterviewInviteSignal } from "@/lib/interviews/interview-signal";

export type InterviewWithApplication = Interview & {
  application: Application & { job: Job };
};

export async function getInterviewsForUser(userId: string): Promise<InterviewWithApplication[]> {
  return prisma.interview.findMany({
    where: { userId },
    include: { application: { include: { job: true } } },
    orderBy: { scheduledAt: "asc" },
  });
}

/** Pure bucketing — not a DB query, unit-tested directly. A missed-logging
 * round (past-dated but never marked completed) still counts as past. */
export function splitUpcomingAndPast(
  interviews: InterviewWithApplication[],
  now: Date = new Date()
): { upcoming: InterviewWithApplication[]; past: InterviewWithApplication[] } {
  const upcoming: InterviewWithApplication[] = [];
  const past: InterviewWithApplication[] = [];

  for (const interview of interviews) {
    const isPast = interview.completed || (interview.scheduledAt !== null && interview.scheduledAt < now);
    if (isPast) past.push(interview);
    else upcoming.push(interview);
  }

  upcoming.sort((a, b) => (a.scheduledAt?.getTime() ?? Infinity) - (b.scheduledAt?.getTime() ?? Infinity));
  past.sort((a, b) => (b.scheduledAt?.getTime() ?? 0) - (a.scheduledAt?.getTime() ?? 0));

  return { upcoming, past };
}

/** Ownership-scoped detail lookup with everything the prep prompt and UI
 * need: the application, its job, and any other completed rounds for the
 * same application (self-excluded by the call site, since this interview
 * may itself already be completed with notes). */
export async function getInterviewDetail(userId: string, interviewId: string) {
  return prisma.interview.findFirst({
    where: { id: interviewId, userId },
    include: {
      application: {
        include: {
          job: true,
          interviews: {
            where: { completed: true, notes: { not: null } },
            orderBy: { scheduledAt: "asc" },
          },
        },
      },
      sourceEmail: { select: { id: true, subject: true } },
    },
  });
}

/** "Previous communication" data source — emails linked (Phase 6) to the
 * application's job. No reusable query for this existed before this phase. */
export async function getLinkedEmailsForApplication(userId: string, jobId: string) {
  return prisma.email.findMany({
    where: { userId, jobId },
    orderBy: { receivedAt: "desc" },
    select: { id: true, subject: true, aiSummary: true, snippet: true, receivedAt: true, category: true },
  });
}

export async function getApplicationsForScheduling(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    include: { job: { select: { role: true, company: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

/** Parses a loose, LLM-extracted date string. Real values seen in
 * `ExtractedEmailData.interviewDate` range from ISO dates to vague text
 * like "TBD" or "soon" — this must never throw, and must reject anything
 * that isn't a genuine date rather than silently accepting garbage. */
export function tryParseInterviewDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Rule 6: this only produces a pre-fill *hint* for the schedule form —
 * the user still has to submit it themselves. Nothing is auto-created. */
export async function getInterviewDateHint(userId: string, applicationId: string): Promise<Date | null> {
  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: { jobId: true },
  });
  if (!app) return null;

  const emails = await prisma.email.findMany({
    where: { userId, jobId: app.jobId },
    orderBy: { receivedAt: "desc" },
    select: { extractedData: true },
    take: 20,
  });

  for (const email of emails) {
    const data = email.extractedData;
    if (data && typeof data === "object" && !Array.isArray(data) && "interviewDate" in data) {
      const parsed = tryParseInterviewDate((data as { interviewDate?: string }).interviewDate);
      if (parsed) return parsed;
    }
  }
  return null;
}

export interface InterviewSuggestion {
  emailId: string;
  applicationId: string;
  company: string;
  role: string;
  subject: string;
  receivedAt: Date | null;
}

/** Emails that look like interview invites — same deterministic-signal
 * shape as the job-lead/application-tracking detectors, but interviews
 * stay confirm-gated rather than auto-created (see
 * confirmInterviewSuggestionAction's doc comment for why). A candidate
 * only becomes a suggestion when its linked Job maps to
 * exactly one tracked Application: `Interview.applicationId` is
 * required, and `Job.applications` has no DB constraint limiting it to
 * one row, so zero or multiple matches are both left to the existing
 * manual "Schedule Interview" page (which has a full application
 * picker) rather than guessed here. */
export async function getInterviewSuggestions(userId: string): Promise<InterviewSuggestion[]> {
  const emails = await prisma.email.findMany({
    where: { userId, jobId: { not: null }, interviewSuggestionDismissed: false },
    orderBy: { receivedAt: "desc" },
    take: 150,
    select: { id: true, subject: true, receivedAt: true, extractedData: true, jobId: true },
  });
  if (emails.length === 0) return [];

  const jobIds = [...new Set(emails.map((e) => e.jobId as string))];
  const applications = await prisma.application.findMany({
    where: { userId, jobId: { in: jobIds } },
    include: { job: { select: { role: true, company: true } } },
  });
  const byJobId = new Map<string, typeof applications>();
  for (const app of applications) {
    const list = byJobId.get(app.jobId) ?? [];
    list.push(app);
    byJobId.set(app.jobId, list);
  }

  const suggestions: InterviewSuggestion[] = [];
  for (const email of emails) {
    const data = email.extractedData;
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;
    const { company, role } = data as { company?: string | null; role?: string | null };
    if (!isInterviewInviteSignal({ company: company ?? null, role: role ?? null, subject: email.subject })) continue;

    const apps = byJobId.get(email.jobId as string) ?? [];
    if (apps.length !== 1) continue;

    const application = apps[0];
    suggestions.push({
      emailId: email.id,
      applicationId: application.id,
      company: application.job.company,
      role: application.job.role,
      subject: email.subject,
      receivedAt: email.receivedAt,
    });
  }
  return suggestions;
}
