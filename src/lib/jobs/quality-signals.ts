import { isPlaceholderText } from "@/lib/utils";
import type { LocationLabel } from "@/lib/matching/location";

export type SignalTone = "positive" | "neutral" | "muted";

export interface QualitySignal {
  label: string;
  tone: SignalTone;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Shared "stale" cutoff — also used as a hard filter on the Jobs list
 * (src/features/jobs/queries.ts) and as Adzuna's own max_days_old search
 * param (src/lib/jobs/adzuna.ts), so the freshness badge shown here can
 * never drift out of sync with what's actually allowed to appear. */
export const FRESHNESS_WINDOW_DAYS = 14;

/** Safely reads a `.salary` string out of an Email's loosely-typed
 * `extractedData` JSON column — mirrors the narrowing pattern already
 * used elsewhere for this same column (e.g. src/lib/applications/auto-track.ts). */
export function extractSalaryString(extractedData: unknown): string | null {
  if (!extractedData || typeof extractedData !== "object" || Array.isArray(extractedData)) return null;
  const salary = (extractedData as { salary?: unknown }).salary;
  return typeof salary === "string" ? salary : null;
}

/** Job "freshness" — postedAt is only reliably set for Adzuna-sourced
 * jobs; email-sourced jobs never get it, so createdAt (always set) is the
 * fallback reference date. */
export function freshnessSignal(job: { postedAt: Date | null; createdAt: Date }, now: Date = new Date()): QualitySignal {
  const reference = job.postedAt ?? job.createdAt;
  const ageDays = Math.floor((now.getTime() - reference.getTime()) / DAY_MS);
  if (ageDays < 3) return { label: "Posted recently", tone: "positive" };
  if (ageDays < FRESHNESS_WINDOW_DAYS) return { label: `${ageDays}d old`, tone: "neutral" };
  return { label: `${ageDays}d old`, tone: "muted" };
}

/** Positive when Job has real numeric salaryMin/salaryMax (Adzuna-sourced
 * jobs). When only a free-text salary string was extracted from a linked
 * email, shown verbatim, never parsed into a number — real strings vary
 * too much in format ("₹18-24 LPA", "$120k-140k") to parse reliably
 * without risking a fabricated figure. Returns null (render nothing) when
 * neither is available — an honest "no signal", not a fabricated zero. */
export function salaryTransparencySignal(
  job: { salaryMin: number | null; salaryMax: number | null; currency: string | null },
  linkedEmailSalary: string | null
): QualitySignal | null {
  if (job.salaryMin != null && job.salaryMax != null) {
    return { label: `${job.currency ?? ""} ${job.salaryMin}–${job.salaryMax}`.trim(), tone: "positive" };
  }
  if (linkedEmailSalary && !isPlaceholderText(linkedEmailSalary)) {
    return { label: linkedEmailSalary, tone: "neutral" };
  }
  return null;
}

function scoreTone(score: number): SignalTone {
  if (score >= 70) return "positive";
  if (score >= 40) return "neutral";
  return "muted";
}

export function skillsMatchSignal(skillsScore: number): QualitySignal {
  return { label: `Skills ${skillsScore}%`, tone: scoreTone(skillsScore) };
}

/** experienceScore is AI-derived (Laya or Ollama), defaulting to a
 * neutral 50 when neither was available — still a real, already-computed
 * signal, just not as certain as the fully deterministic skills/location
 * ones. */
export function experienceMatchSignal(experienceScore: number): QualitySignal {
  return { label: `Experience ${experienceScore}%`, tone: scoreTone(experienceScore) };
}

const LOCATION_LABEL_TONE: Record<LocationLabel, SignalTone> = {
  "remote-friendly": "positive",
  "matches your target locations": "positive",
  "no location preference set": "neutral",
  "outside your target locations": "muted",
};

/** Accepts a plain string, not just the LocationLabel union — `JobMatch
 * .locationLabel` is stored as a nullable DB string, so callers reading
 * it back from Prisma have `string`, not the narrower literal union. */
export function locationMatchSignal(locationLabel: string): QualitySignal {
  return { label: locationLabel, tone: LOCATION_LABEL_TONE[locationLabel as LocationLabel] ?? "neutral" };
}
