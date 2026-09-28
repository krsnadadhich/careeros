import type { EmailCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { findApplicationForEmail } from "./linking";
import { decideSuggestion, REASON_TEXT } from "./status-rules";

export interface LinkEmailInput {
  userId: string;
  emailId: string;
  gmailThreadId: string | null;
  senderEmail: string | null;
  category: EmailCategory;
  extractedCompany: string | null;
}

/** Links an email to an existing application (if any signal matches) and,
 * if warranted, writes a pending status suggestion for the user to
 * confirm or ignore — never applies a status change automatically
 * (spec section 16), and never creates a Job or Application (section 7
 * scopes this to linking against EXISTING applications only). */
export async function linkEmailAndSuggestStatus(input: LinkEmailInput): Promise<void> {
  const application = await findApplicationForEmail({
    userId: input.userId,
    gmailThreadId: input.gmailThreadId,
    senderEmail: input.senderEmail,
    extractedCompany: input.extractedCompany,
  });
  if (!application) return;

  await prisma.email.update({
    where: { id: input.emailId },
    data: { jobId: application.jobId },
  });

  const fullApplication = await prisma.application.findUnique({
    where: { id: application.id },
    select: { suggestedStatus: true, lastIgnoredStatus: true },
  });
  if (!fullApplication) return;

  const target = decideSuggestion({
    currentStatus: application.status,
    pendingSuggestedStatus: fullApplication.suggestedStatus,
    lastIgnoredStatus: fullApplication.lastIgnoredStatus,
    category: input.category,
  });
  if (!target) return;

  await prisma.application.update({
    where: { id: application.id },
    data: {
      suggestedStatus: target,
      suggestedReason: REASON_TEXT[target] ?? null,
      suggestedFromEmailId: input.emailId,
      suggestedAt: new Date(),
    },
  });
}
