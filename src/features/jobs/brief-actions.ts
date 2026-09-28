"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getAIProvider } from "@/lib/ai/get-ai-provider";
import { buildResumeText } from "@/lib/matching/resume-text";

export type GenerateBriefResult = { status: "success"; brief: string } | { status: "error"; message: string };

/** Generates draft application materials (summary/cover letter/Q&A) for a
 * specific job, grounded in the user's real resume and that job's real
 * description — persisted on the Job row so the user can revisit and edit
 * it without regenerating. Never submitted anywhere; this only produces
 * text for the user to review and take with them (spec section 16). */
export async function generateApplicationBriefAction(jobId: string): Promise<GenerateBriefResult> {
  const user = await getCurrentUser();

  const job = await prisma.job.findFirst({ where: { id: jobId, userId: user.id } });
  if (!job) return { status: "error", message: "Job not found." };

  const [profile, primaryResume] = await Promise.all([
    prisma.candidateProfile.findUnique({ where: { userId: user.id } }),
    prisma.resume.findFirst({ where: { userId: user.id, isPrimary: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const resumeText = buildResumeText({
    resume: primaryResume,
    profile: profile ?? { headline: null, yearsExperience: null, targetRoles: [], skills: [] },
  });

  let brief: string;
  try {
    brief = await getAIProvider().generateApplicationBrief({
      resumeText,
      jobDescription: job.description ?? "No job description on record.",
      role: job.role,
      company: job.company,
    });
  } catch (err) {
    console.error("[generateApplicationBriefAction] provider call failed:", (err as Error).message);
    return { status: "error", message: "Couldn't reach the AI provider. Check Settings." };
  }

  const result = await prisma.job.updateMany({
    where: { id: jobId, userId: user.id },
    data: { applicationBrief: brief, applicationBriefGeneratedAt: new Date() },
  });
  if (result.count === 0) return { status: "error", message: "Job not found." };

  revalidatePath(`/jobs/${jobId}`);
  return { status: "success", brief };
}
