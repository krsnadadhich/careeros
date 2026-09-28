import { prisma } from "@/lib/db/prisma";
import type { EmailCategory } from "@prisma/client";

export const INBOX_TABS = [
  "All",
  "Important",
  "Jobs",
  "Recruiters",
  "Interviews",
  "Assessments",
  "Offers",
  "Rejections",
  "Other",
] as const;

export type InboxTab = (typeof INBOX_TABS)[number];

const TAB_TO_CATEGORY: Partial<Record<InboxTab, EmailCategory>> = {
  Jobs: "JOBS",
  Recruiters: "RECRUITERS",
  Interviews: "INTERVIEWS",
  Assessments: "ASSESSMENTS",
  Offers: "OFFERS",
  Rejections: "REJECTION",
  Other: "OTHER",
};

export async function getFilteredEmails(userId: string, tab: InboxTab) {
  const where =
    tab === "Important"
      ? { userId, priority: { in: ["HIGH", "CRITICAL"] as ("HIGH" | "CRITICAL")[] } }
      : TAB_TO_CATEGORY[tab]
        ? { userId, category: TAB_TO_CATEGORY[tab] }
        : { userId };

  return prisma.email.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    take: 50,
  });
}

/** Ownership-scoped lookup — findFirst, not findUnique(id), so an email
 * belonging to another user simply doesn't match rather than leaking
 * existence. */
export async function getEmailById(userId: string, id: string) {
  return prisma.email.findFirst({ where: { id, userId } });
}

export async function getGmailSyncStatus(userId: string) {
  return prisma.gmailSync.findUnique({ where: { userId } });
}
