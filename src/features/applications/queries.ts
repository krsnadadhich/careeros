import { prisma } from "@/lib/db/prisma";
import type { ApplicationStatus } from "@prisma/client";

export const STAGE_ORDER: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "TECHNICAL",
  "HR",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

export async function getKanbanColumns(userId: string) {
  const applications = await prisma.application.findMany({
    where: { userId },
    include: {
      job: {
        include: {
          match: true,
          emails: {
            select: { id: true, subject: true, receivedAt: true },
            orderBy: { receivedAt: "desc" },
          },
        },
      },
    },
    // Most recently applied first; applications with no appliedAt yet
    // (e.g. SAVED, never actually applied) sort after everything that has
    // a real date rather than floating to the top as a false "newest".
    orderBy: [{ appliedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
  });

  return STAGE_ORDER.map((stage) => ({
    stage,
    items: applications.filter((a) => a.status === stage),
  }));
}

