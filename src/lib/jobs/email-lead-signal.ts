import { isPlaceholderText } from "@/lib/utils";
import { subjectLooksLikeConfirmation } from "@/lib/applications/application-signal";

export interface EmailJobLeadSignal {
  company: string | null;
  role: string | null;
  subject: string;
  extractedLink: string | null;
}

/** A job-alert/posting lead — a real company and role mentioned in the
 * email, the subject doesn't carry real application-confirmation
 * wording (the same deterministic subject check as
 * `isApplicationConfirmationSignal`, lib/applications, so an email is
 * never both), AND a real job-posting link was actually found in the
 * email (extract-link.ts). That last check is deliberate and strict:
 * company/role + non-confirmation subject alone isn't enough to prove
 * an email is a genuine job posting — recruiter outreach, newsletters,
 * and promo mail can all produce a plausible company/role pair. A real,
 * pattern-matched link is the strongest available signal that this is
 * an actual listing, not a guess; accepting reduced coverage (platforms
 * outside the known link patterns won't promote at all) in exchange for
 * zero fabricated listings. */
export function isJobPostingLeadSignal(signal: EmailJobLeadSignal): boolean {
  return (
    !isPlaceholderText(signal.company) &&
    !isPlaceholderText(signal.role) &&
    !subjectLooksLikeConfirmation(signal.subject) &&
    signal.extractedLink !== null
  );
}
