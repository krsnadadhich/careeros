import { prisma } from "@/lib/db/prisma";
import { needsFollowUp } from "@/lib/recruiters";
import { isPlaceholderText } from "@/lib/utils";
import type { ExtractedEmailData } from "@/lib/ai/types";

export type GenerateBriefResult =
  | { status: "success"; brief: { lines: string[]; recommendations: string[] } }
  | { status: "error"; message: string };

const MAX_ITEMS_PER_SECTION = 5;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Regenerates today's daily brief from the user's real, current data —
 * never throws, always returns a typed result (same idiom as
 * `syncNewMessages`/`scanForJobs`/`matchJobsForUser`). Upserts on
 * (userId, date) so re-triggering later the same day replaces the brief
 * rather than duplicating it.
 *
 * Deterministic, not AI-generated: everything surfaced here was already
 * flagged at classification/scoring time (Laya's `Email.priority`/
 * `actionRequired`, the existing suggestion/follow-up logic) — there is
 * nothing left to re-analyze, so unlike gmail sync or job matching this
 * has no Laya-vs-Ollama fallback, because there's no model call at all. */
export async function generateDailyBriefForUser(userId: string): Promise<GenerateBriefResult> {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const [urgentEmails, pendingApplications, upcomingInterviews, recruiters] = await Promise.all([
      prisma.email.findMany({
        where: {
          userId,
          receivedAt: { gte: since },
          OR: [{ priority: { in: ["HIGH", "CRITICAL"] } }, { actionRequired: true }],
        },
        orderBy: { receivedAt: "desc" },
        take: MAX_ITEMS_PER_SECTION,
        select: { sender: true, extractedData: true },
      }),
      prisma.application.findMany({
        where: { userId, suggestedStatus: { not: null } },
        include: { job: { select: { role: true, company: true } } },
        take: MAX_ITEMS_PER_SECTION,
      }),
      prisma.interview.findMany({
        where: { userId, completed: false, scheduledAt: { gte: now, lte: in48h } },
        orderBy: { scheduledAt: "asc" },
        take: MAX_ITEMS_PER_SECTION,
        include: { application: { include: { job: { select: { role: true, company: true } } } } },
      }),
      prisma.recruiter.findMany({
        where: { userId },
        include: { emails: { orderBy: { receivedAt: "desc" }, take: 1, select: { actionRequired: true } } },
      }),
    ]);

    const lines: string[] = [];

    if (urgentEmails.length > 0) {
      const names = urgentEmails.map((e) => {
        const data = e.extractedData as ExtractedEmailData | null;
        return !isPlaceholderText(data?.company ?? null) ? (data!.company as string) : e.sender;
      });
      lines.push(
        `${urgentEmails.length} email${urgentEmails.length === 1 ? "" : "s"} need${urgentEmails.length === 1 ? "s" : ""} your attention: ${names.join(", ")}`
      );
    }

    for (const interview of upcomingInterviews) {
      lines.push(
        `Interview with ${interview.application.job.company} — ${interview.type ?? "Round"} on ${interview.scheduledAt!.toLocaleDateString("en-US")}`
      );
    }

    for (const app of pendingApplications) {
      lines.push(`Application to ${app.job.company} — suggested move to ${app.suggestedStatus} (review to confirm)`);
    }

    const recommendations: string[] = [];

    const staleRecruiters = recruiters
      .filter((r) => needsFollowUp(r, now, undefined, r.emails[0]?.actionRequired ?? false))
      .slice(0, MAX_ITEMS_PER_SECTION);
    for (const r of staleRecruiters) {
      const since_ = r.lastContactedAt ?? r.createdAt;
      const days = Math.floor((now.getTime() - since_.getTime()) / (1000 * 60 * 60 * 24));
      recommendations.push(`Follow up with ${r.name}${r.company ? ` (${r.company})` : ""} — no contact in ${days} days`);
    }

    for (const e of urgentEmails) {
      const data = e.extractedData as ExtractedEmailData | null;
      if (data?.assessmentDeadline && !isPlaceholderText(data.assessmentDeadline)) {
        const who = !isPlaceholderText(data.company) ? data.company : e.sender;
        recommendations.push(`Reply to ${who} — assessment deadline: ${data.assessmentDeadline}`);
      }
    }

    const date = startOfToday();
    const saved = await prisma.dailyBrief.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, lines, recommendations },
      update: { lines, recommendations },
    });

    return { status: "success", brief: { lines: saved.lines, recommendations: saved.recommendations } };
  } catch (err) {
    console.error("[generateDailyBriefForUser] failed for", userId, (err as Error).message);
    return { status: "error", message: "Couldn't refresh the brief right now." };
  }
}
