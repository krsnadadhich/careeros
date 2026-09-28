import { prisma } from "@/lib/db/prisma";
import { isApplicationConfirmationSignal } from "./application-signal";
import { createTrackedApplication } from "./create";

export interface AutoTrackResult {
  created: number;
}

/** Mirrors `createJobsFromEmailLeads` (src/lib/jobs/from-email.ts)
 * exactly — same "just record it, no confirm needed" precedent, applied
 * here to the very first step of application tracking: an email
 * confirming "you applied somewhere" becomes a tracked `Application`
 * automatically, the moment it's detected, rather than sitting in a
 * manual queue waiting for a click. This is a deliberate, discussed
 * exception to the app's "never change anything consequential without
 * confirmation" rule — recording an application that was already sent
 * is informational, not an action with external consequences. Status
 * *progression* after this point (interview/offer/rejected) stays
 * confirm-gated via linkEmailAndSuggestStatus/decideSuggestion, which
 * already runs per-message earlier in the same sync — a wrong
 * auto-applied status could mislead the user about where they actually
 * stand, which recording the initial application can't. */
export async function autoTrackApplicationsFromEmail(userId: string): Promise<AutoTrackResult> {
  const emails = await prisma.email.findMany({
    where: { userId, jobId: null, applicationSuggestionDismissed: false },
    orderBy: { receivedAt: "desc" },
    take: 150,
    select: { id: true, subject: true, receivedAt: true, extractedData: true, extractedLink: true },
  });

  let created = 0;

  for (const email of emails) {
    const data = email.extractedData;
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;

    const { company, role, location } = data as {
      company?: string | null;
      role?: string | null;
      location?: string | null;
    };
    if (!isApplicationConfirmationSignal({ company: company ?? null, role: role ?? null, subject: email.subject })) {
      continue;
    }

    const result = await createTrackedApplication(
      userId,
      {
        role: role as string,
        company: company as string,
        location: location ?? null,
        source: "OTHER",
        sourceUrl: email.extractedLink ?? null,
      },
      email.receivedAt ?? new Date()
    );

    if (result.status === "success") {
      await prisma.email.update({ where: { id: email.id }, data: { jobId: result.jobId } });
      created++;
    }
    // A "success: false" result here means an Application for this
    // company/role is already tracked — that's exactly what
    // linkEmailAndSuggestStatus (already run per-message earlier in this
    // same sync) exists to detect and link/suggest a status against;
    // nothing further to do for this email.
  }

  return { created };
}
