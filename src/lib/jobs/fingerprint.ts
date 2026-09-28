import { normalizeForFingerprint } from "@/lib/utils";

/** Per-user deduplication key for a job listing — company + role + location.
 * Two genuinely different roles at the same company/location must not
 * collide; this is deliberately NOT a hash, so it stays debuggable. */
export function computeJobFingerprint(
  role: string,
  company: string,
  location: string | null
): string {
  return [
    normalizeForFingerprint(role),
    normalizeForFingerprint(company),
    normalizeForFingerprint(location ?? ""),
  ].join("|");
}
