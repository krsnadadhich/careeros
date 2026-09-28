import { describe, expect, it } from "vitest";
import { matchesExcludedKeyword } from "@/lib/jobs/scan";
import type { NormalizedJob } from "@/lib/jobs/normalize";

function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    role: "AI Engineer",
    company: "Acme",
    location: "Bangalore",
    salaryMin: null,
    salaryMax: null,
    currency: "INR",
    remote: false,
    source: "ADZUNA",
    sourceUrl: null,
    description: "Build LLM products with Python and RAG.",
    postedAt: null,
    fingerprint: "ai engineer|acme|bangalore",
    ...overrides,
  };
}

describe("matchesExcludedKeyword", () => {
  it("returns false when there are no excluded keywords", () => {
    expect(matchesExcludedKeyword(makeJob(), [])).toBe(false);
  });

  it("matches a keyword found in the role, case-insensitively", () => {
    const job = makeJob({ role: "Manual QA Engineer" });
    expect(matchesExcludedKeyword(job, ["manual qa"])).toBe(true);
  });

  it("matches a keyword found only in the description", () => {
    const job = makeJob({ description: "Looking for a pure frontend specialist." });
    expect(matchesExcludedKeyword(job, ["pure frontend"])).toBe(true);
  });

  it("does not match when no excluded keyword appears anywhere", () => {
    const job = makeJob();
    expect(matchesExcludedKeyword(job, ["manual qa", "pure frontend"])).toBe(false);
  });

  it("handles a job with no description", () => {
    const job = makeJob({ description: null });
    expect(matchesExcludedKeyword(job, ["manual qa"])).toBe(false);
  });
});
