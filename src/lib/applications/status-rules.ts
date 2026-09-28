import type { ApplicationStatus, EmailCategory } from "@prisma/client";

/** Only the 7 non-terminal stages participate in "forward progress" —
 * REJECTED/WITHDRAWN are terminal end-states, not points further along
 * this scale. */
export const PROGRESS_RANK: Partial<Record<ApplicationStatus, number>> = {
  SAVED: 0,
  APPLIED: 1,
  SCREENING: 2,
  INTERVIEW: 3,
  TECHNICAL: 4,
  HR: 5,
  OFFER: 6,
};

/** Deterministic category -> suggested-status mapping. Categories not
 * listed produce no suggestion — intentionally not exhaustive fuzzy NLP;
 * OTHER/etc. simply don't move the needle. HR has no distinct email
 * category to key off, and no email should ever trigger WITHDRAWN — both
 * stay manual-only on the board. */
export const CATEGORY_TO_STATUS: Partial<Record<EmailCategory, ApplicationStatus>> = {
  JOBS: "APPLIED",
  RECRUITERS: "SCREENING",
  INTERVIEWS: "INTERVIEW",
  ASSESSMENTS: "TECHNICAL",
  OFFERS: "OFFER",
  REJECTION: "REJECTED",
};

export const REASON_TEXT: Partial<Record<ApplicationStatus, string>> = {
  APPLIED: "Application confirmation detected",
  SCREENING: "Recruiter outreach detected",
  INTERVIEW: "Interview invitation detected",
  TECHNICAL: "Assessment/technical round detected",
  OFFER: "Offer email detected",
  REJECTED: "Rejection detected",
};

export interface SuggestionInput {
  currentStatus: ApplicationStatus;
  pendingSuggestedStatus: ApplicationStatus | null;
  lastIgnoredStatus: ApplicationStatus | null;
  category: EmailCategory;
}

/** Decides whether to write a NEW suggestion. Returns null when nothing
 * should change — including "leave the existing pending suggestion
 * alone." Never auto-applies anything; the caller only ever writes a
 * pending suggestion for the user to confirm or ignore (spec section 16). */
export function decideSuggestion(input: SuggestionInput): ApplicationStatus | null {
  const target = CATEGORY_TO_STATUS[input.category];
  if (!target) return null;
  if (target === input.currentStatus) return null; // already there
  if (input.currentStatus === "WITHDRAWN") return null; // user closed it out

  if (target !== "REJECTED") {
    if (input.currentStatus === "REJECTED") return null; // don't resurrect
    const currentRank = PROGRESS_RANK[input.currentStatus];
    const targetRank = PROGRESS_RANK[target];
    if (currentRank === undefined || targetRank === undefined || targetRank <= currentRank) {
      return null; // not forward progress
    }
  }

  if (target === input.lastIgnoredStatus) return null; // already declined this exact step

  if (input.pendingSuggestedStatus) {
    if (input.pendingSuggestedStatus === target) return null; // identical suggestion already pending
    if (input.pendingSuggestedStatus === "REJECTED") return null; // never downgrade away from a pending rejection
    if (target !== "REJECTED") {
      const pendingRank = PROGRESS_RANK[input.pendingSuggestedStatus];
      const targetRank = PROGRESS_RANK[target];
      if (pendingRank === undefined || targetRank === undefined || targetRank <= pendingRank) {
        return null; // don't clobber with a same/earlier guess
      }
    }
    // else: target === REJECTED overriding a non-rejection pending
    // suggestion — allowed, a rejection signal outranks a stale forward guess.
  }

  return target;
}
