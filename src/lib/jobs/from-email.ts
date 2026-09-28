import { prisma } from "@/lib/db/prisma";
import type { JobSource } from "@prisma/client";
import { computeJobFingerprint } from "./fingerprint";
import { isJobPostingLeadSignal } from "./email-lead-signal";

export interface EmailJobLeadsResult {
  created: number;
  linked: number;
}

function guessSource(senderEmail: string | null): JobSource {
  const domain = senderEmail?.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("linkedin")) return "LINKEDIN";
  if (domain.includes("indeed")) return "INDEED";
  return "OTHER";
}

/** Promotes job-alert/posting emails (LinkedIn Job Alerts, Wellfound
 * matches, Indeed postings, ...) already sitting in the user's own
 * synced inbox into browsable Job rows — the ToS-compliant alternative
 * to scraping those platforms directly (never fetches anything from the
 * web; only reads emails the user already legitimately received and
 * that Gmail sync already stored). Only ever creates an informational
 * listing for the user to review and apply to themselves via the Jobs
 * page — never an Application, never any submission (spec section 16).
 * Feeds the same matching pipeline Adzuna-sourced jobs do, so these get
 * a real score against the resume rather than a raw, unranked dump. */
export async function createJobsFromEmailLeads(userId: string): Promise<EmailJobLeadsResult> {
  // Restricted to the JOBS category specifically (unlike application-
  // suggestion detection, which deliberately isn't) — this is a write
  // path that creates real, visible listings, so it needs the extra
  // precision. Real data showed JOBS is a solid category for "is this
  // actually job-related," while a category-agnostic version pulled in
  // hallucinated company/role pairs from security alerts and LinkedIn
  // connection notifications.
  const emails = await prisma.email.findMany({
    where: { userId, jobId: null, category: "JOBS" },
    orderBy: { receivedAt: "desc" },
    take: 100,
    select: {
      id: true,
      senderEmail: true,
      subject: true,
      aiSummary: true,
      extractedData: true,
      extractedLink: true,
      bodyText: true,
    },
  });

  let created = 0;
  let linked = 0;

  for (const email of emails) {
    const data = email.extractedData;
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;

    const { company, role, location } = data as {
      company?: string | null;
      role?: string | null;
      location?: string | null;
    };
    if (
      !isJobPostingLeadSignal({
        company: company ?? null,
        role: role ?? null,
        subject: email.subject,
        extractedLink: email.extractedLink,
      })
    ) {
      continue;
    }

    const fingerprint = computeJobFingerprint(role as string, company as string, location ?? null);
    const existing = await prisma.job.findFirst({ where: { userId, fingerprint }, select: { id: true } });

    if (existing) {
      await prisma.email.update({ where: { id: email.id }, data: { jobId: existing.id } });
      linked++;
      continue;
    }

    // aiSummary is lazy since Phase A (null until the user individually
    // opens that email — lib/gmail/lazy-summary.ts), which bulk job-alert
    // emails essentially never are, so it's rarely available here. Fall
    // back to real truncated body content rather than leaving the
    // description as just the subject line.
    const bodyPreview = email.bodyText ? email.bodyText.slice(0, 600).trim() : null;
    const description = [email.subject, email.aiSummary ?? bodyPreview].filter(Boolean).join("\n\n") || null;

    try {
      const job = await prisma.job.create({
        data: {
          userId,
          role: role as string,
          company: company as string,
          location: location ?? null,
          source: guessSource(email.senderEmail),
          description,
          sourceUrl: email.extractedLink ?? null,
          fingerprint,
        },
      });
      await prisma.email.update({ where: { id: email.id }, data: { jobId: job.id } });
      created++;
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") continue; // created concurrently — fine
      console.error("[jobs/from-email] failed to create job from email:", email.id, (err as Error).message);
    }
  }

  return { created, linked };
}
