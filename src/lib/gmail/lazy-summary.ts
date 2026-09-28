import type { Email } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getAIProvider } from "@/lib/ai/get-ai-provider";

/** Fills in `aiSummary` the first time an email is actually opened, since
 * Laya-classified emails are stored with `aiSummary: null` (Laya cannot
 * generate free text — see lib/laya/classify-email.ts). Never breaks the
 * page: any failure just leaves it null for the next open to retry. */
export async function ensureEmailSummary(email: Email): Promise<Email> {
  if (email.aiSummary) return email;

  try {
    const summary = await getAIProvider().summarizeEmail({
      subject: email.subject,
      body: email.bodyText || email.snippet || "",
    });
    return await prisma.email.update({
      where: { id: email.id },
      data: { aiSummary: summary },
    });
  } catch (err) {
    console.warn("[lazy-summary] failed to generate summary for", email.id, err);
    return email;
  }
}
