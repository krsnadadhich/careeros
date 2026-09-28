import { prisma } from "@/lib/db/prisma";

export async function getPrimaryResume(userId: string) {
  return prisma.resume.findFirst({
    where: { userId, isPrimary: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Ownership-scoped lookup — findFirst, not findUnique(id), matching the
 * getEmailById/getJobWithMatch idiom used elsewhere. */
export async function getResumeById(userId: string, id: string) {
  return prisma.resume.findFirst({ where: { id, userId } });
}

export async function getCandidateProfile(userId: string) {
  return prisma.candidateProfile.findUnique({ where: { userId } });
}

export async function nextResumeVersion(userId: string): Promise<number> {
  const result = await prisma.resume.aggregate({
    where: { userId },
    _max: { version: true },
  });
  return (result._max.version ?? 0) + 1;
}
