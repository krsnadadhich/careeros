import { isPlaceholderText } from "@/lib/utils";

export interface InterviewSignal {
  company: string | null;
  role: string | null;
  subject: string;
}

const INTERVIEW_SUBJECT_KEYWORDS = ["interview", "phone screen", "screening call"];

function subjectLooksLikeInterviewInvite(subject: string): boolean {
  const lower = subject.toLowerCase();
  return INTERVIEW_SUBJECT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/** Mirrors `isApplicationConfirmationSignal` (src/lib/applications/application-signal.ts) —
 * deterministic subject-keyword + real-company/role check, deliberately
 * not gated on `category` either, matching that function's established
 * precedent in this codebase. */
export function isInterviewInviteSignal(signal: InterviewSignal): boolean {
  return (
    !isPlaceholderText(signal.company) &&
    !isPlaceholderText(signal.role) &&
    subjectLooksLikeInterviewInvite(signal.subject)
  );
}

const TYPE_KEYWORDS: [string, string][] = [
  ["phone screen", "Phone Screen"],
  ["technical", "Technical"],
  ["onsite", "Onsite"],
  ["final round", "Final Round"],
  ["hr", "HR"],
];

/** Best-effort `Interview.type` label from the subject line — there's no
 * extracted field for this (ExtractedEmailDataSchema has none), and a
 * suggestion-confirmed interview otherwise has no way to ever get a type
 * label beyond the permanent "Round" display fallback. */
export function inferInterviewType(subject: string): string | null {
  const lower = subject.toLowerCase();
  for (const [keyword, label] of TYPE_KEYWORDS) {
    if (lower.includes(keyword)) return label;
  }
  return null;
}
