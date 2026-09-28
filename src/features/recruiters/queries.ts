import { prisma } from "@/lib/db/prisma";
import { needsFollowUp } from "@/lib/recruiters";
import type { Recruiter, EmailCategory } from "@prisma/client";

export type RecruiterWithEmails = Recruiter & {
  emails: {
    id: string;
    subject: string;
    aiSummary: string | null;
    receivedAt: Date | null;
    actionRequired: boolean;
    category: EmailCategory;
    job: { role: string; company: string } | null;
  }[];
};

const RECRUITER_EMAIL_SELECT = {
  id: true,
  subject: true,
  aiSummary: true,
  receivedAt: true,
  actionRequired: true,
  category: true,
  job: { select: { role: true, company: true } },
} as const;

export async function getRecruitersForUser(userId: string): Promise<RecruiterWithEmails[]> {
  return prisma.recruiter.findMany({
    where: { userId },
    include: { emails: { select: RECRUITER_EMAIL_SELECT, orderBy: { receivedAt: "desc" }, take: 3 } },
    orderBy: { lastContactedAt: "desc" },
  });
}

export async function getRecruiterDetail(userId: string, recruiterId: string): Promise<RecruiterWithEmails | null> {
  return prisma.recruiter.findFirst({
    where: { id: recruiterId, userId },
    include: { emails: { select: RECRUITER_EMAIL_SELECT, orderBy: { receivedAt: "desc" } } },
  });
}

/** Pure bucketing, mirroring interviews' splitUpcomingAndPast — not a DB
 * query, unit-tested directly. */
export function splitByFollowUp(
  recruiters: RecruiterWithEmails[],
  now: Date = new Date()
): { needsFollowUp: RecruiterWithEmails[]; upToDate: RecruiterWithEmails[] } {
  const needs: RecruiterWithEmails[] = [];
  const upToDate: RecruiterWithEmails[] = [];

  for (const recruiter of recruiters) {
    const latestEmailNeedsReply = recruiter.emails[0]?.actionRequired ?? false;
    if (needsFollowUp(recruiter, now, undefined, latestEmailNeedsReply)) needs.push(recruiter);
    else upToDate.push(recruiter);
  }

  const byLastContact = (a: RecruiterWithEmails, b: RecruiterWithEmails) => {
    const aTime = (a.lastContactedAt ?? a.createdAt).getTime();
    const bTime = (b.lastContactedAt ?? b.createdAt).getTime();
    return aTime - bTime;
  };
  needs.sort(byLastContact);
  upToDate.sort((a, b) => byLastContact(b, a));

  return { needsFollowUp: needs, upToDate };
}
