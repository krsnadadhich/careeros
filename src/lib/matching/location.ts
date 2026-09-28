export interface LocationScoreInput {
  job: { location: string | null; remote: boolean };
  targetLocations: string[];
}

export type LocationLabel =
  | "remote-friendly"
  | "no location preference set"
  | "matches your target locations"
  | "outside your target locations";

export interface LocationScoreResult {
  locationScore: number;
  label: LocationLabel;
}

/** Deterministic location fit, in priority order:
 * 1. Remote jobs score highest — scanForJobs already hard-filters to
 *    remote-only when the profile requests it, so a remote job reaching
 *    this stage is already a structural fit regardless of stated cities.
 * 2. No stated location preference — can't call it a mismatch.
 * 3. The job's location overlaps a target location (case-insensitive,
 *    either-direction substring, e.g. "Bangalore" vs "Bangalore, India").
 * 4. Otherwise, an explicit mismatch. */
export function computeLocationScore({ job, targetLocations }: LocationScoreInput): LocationScoreResult {
  if (job.remote) {
    return { locationScore: 100, label: "remote-friendly" };
  }
  if (targetLocations.length === 0) {
    return { locationScore: 70, label: "no location preference set" };
  }

  const jobLocation = job.location?.toLowerCase().trim() ?? "";
  const overlaps =
    jobLocation.length > 0 &&
    targetLocations.some((target) => {
      const t = target.toLowerCase().trim();
      return t.length > 0 && (jobLocation.includes(t) || t.includes(jobLocation));
    });

  return overlaps
    ? { locationScore: 100, label: "matches your target locations" }
    : { locationScore: 40, label: "outside your target locations" };
}
