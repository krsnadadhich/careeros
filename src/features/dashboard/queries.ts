import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export async function getKpis(userId: string) {
  const [emailCount, importantEmailCount, jobCount, strongMatchCount, applicationCount, interviewCount] =
    await Promise.all([
      prisma.email.count({ where: { userId } }),
      prisma.email.count({ where: { userId, priority: { in: ["HIGH", "CRITICAL"] } } }),
      prisma.job.count({ where: { userId } }),
      prisma.jobMatch.count({ where: { userId, overallScore: { gte: 90 } } }),
      prisma.application.count({ where: { userId, status: { not: "REJECTED" } } }),
      prisma.application.count({
        where: { userId, status: { in: ["INTERVIEW", "TECHNICAL"] } },
      }),
    ]);

  return {
    newEmails: emailCount,
    important: importantEmailCount,
    newJobs: jobCount,
    strongMatches: strongMatchCount,
    applications: applicationCount,
    interviews: interviewCount,
  };
}

export async function getAttentionItems(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { userId, completed: false },
    orderBy: { dueAt: "asc" },
    take: 5,
  });
  return tasks;
}

export async function getLatestBrief(userId: string) {
  return prisma.dailyBrief.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
  });
}

export async function getTopMatches(userId: string, take = 3) {
  return prisma.jobMatch.findMany({
    where: { userId },
    orderBy: { overallScore: "desc" },
    take,
    include: { job: true },
  });
}

export async function getNotifications(userId: string) {
  const overdueTasks = await prisma.task.findMany({
    where: { userId, completed: false, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "desc" },
    take: 5,
  });

  return overdueTasks.map((t) => ({
    id: t.id,
    icon: "⏰",
    text: t.title,
    time: t.dueAt ? formatDate(t.dueAt) : "",
  }));
}
