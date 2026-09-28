import type { JobSearchCriteria, RawJob, JobSourceAdapter } from "./types";
import { FRESHNESS_WINDOW_DAYS } from "./quality-signals";

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";
const COUNTRY = "in";
const RESULTS_PER_PAGE = 20;

// Biases every scan toward beginner-friendly listings — real, documented
// Adzuna params (verified against their API docs): what_or is an "any of
// these" filter, distinct from `what`'s exact-role match, so it doesn't
// require the literal word "fresher" to appear in a posting to match;
// what_exclude screens out obviously senior-level listings.
const FRESHER_KEYWORDS = "fresher,entry level,graduate,junior,trainee";
const SENIOR_EXCLUDE_KEYWORDS = "senior,lead,principal,staff,architect";

// Adzuna's free-tier quota isn't authoritatively published — bound the
// number of real HTTP calls a single scan can make regardless of how many
// roles/locations a user configures.
const ROLE_CAP = 3;
const LOCATION_CAP = 2;
const MAX_TOTAL_CALLS = 8;

export class AdzunaNotConfiguredError extends Error {
  constructor(message = "Adzuna isn't configured.") {
    super(message);
  }
}

export class AdzunaApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function isAdzunaConfigured(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

interface AdzunaResultItem {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  description?: string;
  redirect_url?: string;
  created?: string;
}

interface AdzunaSearchResponse {
  results?: AdzunaResultItem[];
}

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

/** Strips control characters and bounds length before a user-influenced
 * value ever reaches an external API (section 26). */
function sanitizeQueryTerm(value: string): string {
  return value.replace(CONTROL_CHARS, "").trim().slice(0, 100);
}

function mapAdzunaResult(item: AdzunaResultItem): RawJob {
  return {
    sourceId: item.id,
    source: "ADZUNA",
    title: item.title,
    company: item.company?.display_name ?? "Unknown",
    location: item.location?.display_name ?? null,
    salaryMin: item.salary_min ?? null,
    salaryMax: item.salary_max ?? null,
    currency: "INR",
    description: item.description ?? null,
    sourceUrl: item.redirect_url ?? null,
    postedAt: item.created ?? null,
  };
}

async function searchOne(
  what: string,
  where: string | null,
  criteria: JobSearchCriteria
): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new AdzunaNotConfiguredError();

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    "content-type": "application/json",
    results_per_page: String(RESULTS_PER_PAGE),
    what: sanitizeQueryTerm(what),
    what_or: FRESHER_KEYWORDS,
    what_exclude: SENIOR_EXCLUDE_KEYWORDS,
    max_days_old: String(FRESHNESS_WINDOW_DAYS),
  });
  if (where) params.set("where", sanitizeQueryTerm(where));
  if (criteria.minSalary) params.set("salary_min", String(Math.max(0, Math.floor(criteria.minSalary))));
  if (criteria.maxSalary) params.set("salary_max", String(Math.max(0, Math.floor(criteria.maxSalary))));

  const res = await fetch(`${ADZUNA_BASE}/${COUNTRY}/search/1?${params.toString()}`);
  if (!res.ok) {
    throw new AdzunaApiError(`Adzuna request failed: ${res.status} ${res.statusText}`, res.status);
  }

  const data = (await res.json()) as AdzunaSearchResponse;
  return (data.results ?? []).map(mapAdzunaResult);
}

/** Exported for unit testing — pure, no network. Bounds the number of
 * real HTTP calls a scan can make regardless of how many roles/locations
 * a user has configured (Adzuna's free-tier quota isn't authoritatively
 * published, so this stays conservative independent of it). */
export function buildSearchCombos(criteria: JobSearchCriteria): [string, string | null][] {
  const roles = criteria.roles.slice(0, ROLE_CAP);
  const locations = criteria.remoteOnly ? [] : criteria.locations.slice(0, LOCATION_CAP);

  const combos: [string, string | null][] = [];
  for (const role of roles) {
    if (locations.length === 0) combos.push([role, null]);
    else for (const loc of locations) combos.push([role, loc]);
  }
  return combos.slice(0, MAX_TOTAL_CALLS);
}

export const adzunaSource: JobSourceAdapter = {
  name: "adzuna",

  async search(criteria: JobSearchCriteria): Promise<RawJob[]> {
    const combos = buildSearchCombos(criteria);

    const results: RawJob[] = [];
    for (const [what, where] of combos) {
      try {
        results.push(...(await searchOne(what, where, criteria)));
      } catch (err) {
        // One bad combo/call must not abort the whole scan (section 29).
        console.error("[jobs/adzuna] search combo failed:", what, where, (err as Error).message);
      }
    }
    return results;
  },
};
