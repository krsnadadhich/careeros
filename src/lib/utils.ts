export { cn } from "cn";

const MAX_COMMA_LIST_ITEMS = 30;

/** Parses a comma-separated form field into a clean string array: trims
 * whitespace, drops empty entries (trailing/double commas), dedupes
 * case-insensitively while preserving first-seen casing, and caps the
 * length so a pasted paragraph can't silently create hundreds of rows.
 * Shared by resume/profile fields (targetRoles, skills, ...) and job
 * search config (excludedKeywords). */
export function parseCommaList(input: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of input.split(",")) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= MAX_COMMA_LIST_ITEMS) break;
  }

  return result;
}

const PLACEHOLDER_VALUES = new Set([
  "", "n/a", "na", "none", "null", "undefined", "unknown",
  "no specified", "not specified", "no name", "not provided", "not available",
]);

/** True for values a small local LLM commonly emits in place of a real
 * null when a structured-extraction field has nothing to fill ("N/A",
 * "None", "null", ...) — treating these as real data is what let garbage
 * like a Recruiter contact literally named "N/A" get persisted. Shared by
 * recruiter-identity extraction (lib/recruiters) and application-signal
 * detection (lib/applications) — both parse the same kind of loosely-typed
 * LLM string fields. */
export function isPlaceholderText(value: string | null | undefined): boolean {
  if (!value) return true;
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

/** Consistent date/time formatting for every place a stored Date gets
 * rendered as text. Always passes an explicit locale ("en-US") —
 * `toLocaleDateString()`/`toLocaleString()` called with no locale use
 * the runtime's default, and a component that renders in a Server
 * Component and then hydrates on the client can hit a genuine SSR
 * hydration mismatch when the Node server process and the browser
 * disagree on that default (seen for real: the same date rendered
 * "Sunday, September 6" server-side and "Sunday, 6 September" client-
 * side, since the browser's locale wasn't en-US). Never use the bare
 * `.toLocaleDateString()`/`.toLocaleString()` methods directly in a
 * component that's ever server-rendered — always go through these. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US");
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US");
}

/** Lowercases, strips punctuation, and collapses whitespace so trivial
 * formatting differences ("Senior AI Engineer" vs "Senior AI Engineer ")
 * don't produce different comparison keys. Shared by job fingerprinting
 * (lib/jobs) and email-to-application company-name matching (lib/applications). */
export function normalizeForFingerprint(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
