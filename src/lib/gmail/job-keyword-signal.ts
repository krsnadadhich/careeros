const JOB_RELATED_SUBJECT_KEYWORDS = [
  "application",
  "applying",
  "apply",
  "interview",
  "assessment",
  "screening",
  "offer",
  "recruiter",
  "position",
  "role",
  "job",
  "hiring",
  "candidate",
];

/** A broader deterministic keyword check than application-signal.ts's
 * subjectLooksLikeConfirmation — that one is intentionally narrow
 * ("confirmation" wording only). This one is used to decide whether it's
 * safe to skip the extractEmailData call entirely (see sync.ts): any
 * job-search vocabulary at all in the subject means extraction must still
 * run, since sync.ts's own comment on extractEmailData documents the
 * classifier misfiring "OTHER" on real application confirmations like
 * "Thanks for applying to X" — that subject contains "applying", so this
 * check correctly keeps extraction running for it. */
export function looksJobRelatedByKeyword(subject: string): boolean {
  const lower = subject.toLowerCase();
  return JOB_RELATED_SUBJECT_KEYWORDS.some((keyword) => lower.includes(keyword));
}
