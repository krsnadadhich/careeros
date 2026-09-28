import type { JobSource } from "@prisma/client";
import type { RawJob } from "./types";
import { computeJobFingerprint } from "./fingerprint";

const REMOTE_PATTERN = /\b(remote|work from home|wfh)\b/i;

/** Checks both location and title — a listing titled "Remote Senior AI
 * Engineer" with no location string should still be flagged remote. */
export function detectRemote(location: string | null, title: string): boolean {
  return REMOTE_PATTERN.test(location ?? "") || REMOTE_PATTERN.test(title);
}

export interface NormalizedJob {
  role: string;
  company: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  remote: boolean;
  source: JobSource;
  sourceUrl: string | null;
  description: string | null;
  postedAt: Date | null;
  fingerprint: string;
}

export function normalizeRawJob(raw: RawJob): NormalizedJob {
  const role = raw.title.trim();
  const company = raw.company.trim();
  const location = raw.location?.trim() || null;

  return {
    role,
    company,
    location,
    salaryMin: raw.salaryMin != null ? Math.round(raw.salaryMin) : null,
    salaryMax: raw.salaryMax != null ? Math.round(raw.salaryMax) : null,
    currency: raw.currency ?? "INR",
    remote: detectRemote(location, role),
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    description: raw.description,
    postedAt: raw.postedAt ? new Date(raw.postedAt) : null,
    fingerprint: computeJobFingerprint(role, company, location),
  };
}
