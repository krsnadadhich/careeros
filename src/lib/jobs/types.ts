import type { JobSource } from "@prisma/client";

export interface JobSearchCriteria {
  roles: string[];
  locations: string[];
  remoteOnly: boolean;
  minSalary?: number;
  maxSalary?: number;
}

/** Unnormalized result straight from a source's API. */
export interface RawJob {
  sourceId: string;
  source: JobSource;
  title: string;
  company: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  description: string | null;
  sourceUrl: string | null;
  postedAt: string | null;
}

/**
 * Named `JobSourceAdapter` rather than the product spec's literal
 * `JobSource` — that name is already the Prisma enum
 * (LINKEDIN|INDEED|ADZUNA|COMPANY_WEBSITE|OTHER) — but it plays the exact
 * role the spec describes: `{ name, search(criteria) }`.
 */
export interface JobSourceAdapter {
  name: string;
  search(criteria: JobSearchCriteria): Promise<RawJob[]>;
}
