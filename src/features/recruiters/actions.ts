"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export type ActionResult = { status: "success" } | { status: "error"; message: string };

/** Logs that the user followed up with this recruiter themselves — never
 * sends anything on their behalf (section 16). This is the same
 * after-the-fact logging pattern as interviews' "Log This Round". */
export async function markRecruiterContacted(recruiterId: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  const result = await prisma.recruiter.updateMany({
    where: { id: recruiterId, userId: user.id },
    data: { lastContactedAt: new Date() },
  });
  if (result.count === 0) return { status: "error", message: "Recruiter not found." };

  revalidatePath("/recruiters");
  revalidatePath(`/recruiters/${recruiterId}`);
  return { status: "success" };
}

export async function updateRecruiterNotes(recruiterId: string, notes: string | null): Promise<ActionResult> {
  const user = await getCurrentUser();

  const result = await prisma.recruiter.updateMany({
    where: { id: recruiterId, userId: user.id },
    data: { notes },
  });
  if (result.count === 0) return { status: "error", message: "Recruiter not found." };

  revalidatePath(`/recruiters/${recruiterId}`);
  return { status: "success" };
}
