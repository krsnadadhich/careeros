import { prisma } from "@/lib/db/prisma";
import { computeSkillFrequencies, computeSkillGaps } from "@/lib/skills";

export async function getSkillFrequenciesForUser(userId: string) {
  const matches = await prisma.jobMatch.findMany({
    where: { userId },
    select: { matchedSkills: true, missingSkills: true },
  });
  return computeSkillFrequencies(matches);
}

export async function getSkillGapsForUser(userId: string) {
  const [matches, profile] = await Promise.all([
    prisma.jobMatch.findMany({ where: { userId }, select: { requiredSkills: true } }),
    prisma.candidateProfile.findUnique({ where: { userId }, select: { skills: true } }),
  ]);
  return computeSkillGaps(matches, profile?.skills ?? []);
}
