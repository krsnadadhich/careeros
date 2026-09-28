import { isPlaceholderText } from "@/lib/utils";

export interface ApplicationSignal {
  company: string | null;
  role: string | null;
  subject: string;
}

/** Real-world confirmation subjects consistently use this vocabulary
 * ("Application Received", "Thank you for applying to X", "Application
 * Submitted", "Assessment request: ...") — a deterministic signal pulled
 * from the email's own template wording, not something the model has to
 * infer. This replaced an earlier version gated on the LLM-extracted
 * `applicationStage` field: real data showed the local model happily
 * invents a plausible-looking stage ("Available", "Apply with resume &
 * profile") even for a plain "your job alert was created" notification,
 * which made that field useless as a discriminator. Subject-line
 * wording is far more reliable since it comes verbatim from the sender's
 * own template, not a free-text LLM guess. */
const CONFIRMATION_SUBJECT_KEYWORDS = [
  "application",
  "applying",
  "thank you for your interest",
  "assessment request",
  "assessment invitation",
  "screening review",
];

function subjectLooksLikeConfirmation(subject: string): boolean {
  const lower = subject.toLowerCase();
  return CONFIRMATION_SUBJECT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/** Decides whether an email looks like a genuine application
 * CONFIRMATION — not just a job posting/alert, which can also mention a
 * real company and role. Requires company and role to both be real
 * (non-placeholder) extracted values AND the subject to carry real
 * confirmation wording. */
export function isApplicationConfirmationSignal(signal: ApplicationSignal): boolean {
  return (
    !isPlaceholderText(signal.company) &&
    !isPlaceholderText(signal.role) &&
    subjectLooksLikeConfirmation(signal.subject)
  );
}

export { subjectLooksLikeConfirmation };
