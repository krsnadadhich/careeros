import { prisma } from "@/lib/db/prisma";
import { needsFollowUp } from "@/lib/recruiters";

export interface ContextAvailability {
  emails: boolean;
  applications: boolean;
  interviews: boolean;
  jobMatches: boolean;
  recruiters: boolean;
  tasks: boolean;
}

/** Whether each section of `buildUserDataDigest` (src/lib/context/user-digest.ts)
 * would actually have real content, or just its honest "No X yet"
 * fallback — mirrors that function's exact per-section filters, not just
 * "does any row exist". Used by the Ask AI grounding gate
 * (src/lib/laya/grounding-check.ts) to decide whether a question about a
 * given topic can be answered from real data. */
export async function getContextAvailability(userId: string): Promise<ContextAvailability> {
  const now = new Date();

  const [emails, applications, interviews, jobMatches, recruiters, tasks] = await Promise.all([
    prisma.email.count({ where: { userId } }),
    prisma.application.count({ where: { userId } }),
    prisma.interview.count({ where: { userId, completed: false } }),
    prisma.jobMatch.count({ where: { userId, overallScore: { gte: 75 } } }),
    prisma.recruiter.findMany({
      where: { userId },
      select: {
        lastContactedAt: true,
        createdAt: true,
        emails: { orderBy: { receivedAt: "desc" }, take: 1, select: { actionRequired: true } },
      },
    }),
    prisma.task.count({ where: { userId, completed: false } }),
  ]);

  return {
    emails: emails > 0,
    applications: applications > 0,
    interviews: interviews > 0,
    jobMatches: jobMatches > 0,
    recruiters: recruiters.some((r) => needsFollowUp(r, now, undefined, r.emails[0]?.actionRequired ?? false)),
    tasks: tasks > 0,
  };
}
