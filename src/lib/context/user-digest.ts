import { prisma } from "@/lib/db/prisma";
import { needsFollowUp } from "@/lib/recruiters";
import { formatDate, formatDateTime } from "@/lib/utils";

/** Builds a compact, labeled text digest of the user's real, current data
 * — the same "concatenate real, labeled sections with honest empty
 * fallbacks" approach as `buildInterviewPrepInput` (Phase 7), scoped
 * across every domain instead of one application. Every line here traces
 * to a real DB row; nothing is inferred or fabricated. Bounded `take`
 * limits keep this within a local model's context window without needing
 * a separate truncation pass. Shared by the chat assistant and the daily
 * brief generator — both need the same "what's going on right now"
 * snapshot, so it lives in `lib/` rather than duplicated per feature. */
export async function buildUserDataDigest(userId: string): Promise<string> {
  const now = new Date();

  const [emails, applications, interviews, matches, recruiters, tasks] = await Promise.all([
    prisma.email.findMany({
      where: { userId },
      orderBy: { receivedAt: "desc" },
      take: 8,
      select: { subject: true, sender: true, category: true, priority: true, aiSummary: true, receivedAt: true },
    }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { job: { select: { role: true, company: true } } },
    }),
    prisma.interview.findMany({
      where: { userId, completed: false },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { application: { include: { job: { select: { role: true, company: true } } } } },
    }),
    prisma.jobMatch.findMany({
      where: { userId, overallScore: { gte: 75 } },
      orderBy: { overallScore: "desc" },
      take: 5,
      include: { job: { select: { role: true, company: true, applications: { where: { userId }, select: { id: true } } } } },
    }),
    prisma.recruiter.findMany({
      where: { userId },
      take: 30,
      include: { emails: { orderBy: { receivedAt: "desc" }, take: 1, select: { actionRequired: true } } },
    }),
    prisma.task.findMany({ where: { userId, completed: false }, orderBy: { dueAt: "asc" }, take: 10 }),
  ]);

  const lines: string[] = [`Today's date: ${now.toDateString()}`];

  lines.push("", "## Recent Emails");
  if (emails.length === 0) lines.push("No emails synced yet.");
  else
    for (const e of emails) {
      const when = e.receivedAt ? formatDate(e.receivedAt) : "unknown date";
      lines.push(`- [${e.category}/${e.priority}] "${e.subject}" from ${e.sender} (${when})${e.aiSummary ? ` — ${e.aiSummary}` : ""}`);
    }

  lines.push("", "## Applications (most recently active)");
  if (applications.length === 0) lines.push("No applications tracked yet.");
  else
    for (const a of applications) {
      lines.push(`- ${a.job.role} at ${a.job.company}: status ${a.status}${a.nextAction ? `, next action: ${a.nextAction}` : ""}`);
    }

  lines.push("", "## Upcoming Interviews");
  if (interviews.length === 0) lines.push("No upcoming interviews scheduled.");
  else
    for (const i of interviews) {
      const when = i.scheduledAt ? formatDateTime(i.scheduledAt) : "date not set yet";
      lines.push(`- ${i.type ?? "Round"} for ${i.application.job.role} at ${i.application.job.company} — ${when}`);
    }

  lines.push("", "## Strong Job Matches (score 75+)");
  if (matches.length === 0) lines.push("No strong matches computed yet.");
  else
    for (const m of matches) {
      const applied = m.job.applications.length > 0;
      lines.push(`- ${m.job.role} at ${m.job.company}: match score ${m.overallScore} (${applied ? "already applied" : "not yet applied"})`);
    }

  const followUps = recruiters.filter((r) => needsFollowUp(r, now, undefined, r.emails[0]?.actionRequired ?? false));
  lines.push("", "## Recruiters Needing Follow-up");
  if (followUps.length === 0) lines.push("No recruiters currently need follow-up.");
  else
    for (const r of followUps) {
      lines.push(`- ${r.name}${r.company ? ` (${r.company})` : ""}: last contact ${r.lastContactedAt ? formatDate(r.lastContactedAt) : "never"}`);
    }

  lines.push("", "## Open Tasks");
  if (tasks.length === 0) lines.push("No open tasks.");
  else
    for (const t of tasks) {
      lines.push(`- ${t.title}${t.dueAt ? ` (due ${formatDate(t.dueAt)})` : ""}`);
    }

  return lines.join("\n");
}
