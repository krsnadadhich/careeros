import { prisma } from "@/lib/db/prisma";
import { extractRecruiterIdentity, findOrCreateRecruiter, type RecruiterEmailSignal } from "./detect";

export interface LinkEmailToRecruiterInput extends RecruiterEmailSignal {
  userId: string;
  emailId: string;
  receivedAt: Date | null;
}

/** Links an email to a Recruiter contact (creating one if this is the
 * first time we've seen them) and bumps `lastContactedAt` when the email
 * is newer than what's on record. Never sends anything and never talks
 * to the recruiter — this only organizes inbound data, the same class of
 * action as auto-filing an email into a category (section 16 governs
 * outbound/consequential actions, not this). */
export async function linkEmailToRecruiter(input: LinkEmailToRecruiterInput): Promise<void> {
  const identity = extractRecruiterIdentity(input);
  if (!identity) return;

  const recruiter = await findOrCreateRecruiter(input.userId, identity);

  await prisma.email.update({
    where: { id: input.emailId },
    data: { recruiterId: recruiter.id },
  });

  if (input.receivedAt && (!recruiter.lastContactedAt || input.receivedAt > recruiter.lastContactedAt)) {
    await prisma.recruiter.update({
      where: { id: recruiter.id },
      data: { lastContactedAt: input.receivedAt },
    });
  }
}
