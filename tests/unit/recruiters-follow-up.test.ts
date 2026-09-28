import { describe, expect, it } from "vitest";
import { needsFollowUp } from "@/lib/recruiters/follow-up";
import { splitByFollowUp, type RecruiterWithEmails } from "@/features/recruiters/queries";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("needsFollowUp", () => {
  it("is false just under the threshold since last contact", () => {
    const recruiter = { lastContactedAt: new Date("2026-06-09T12:00:00Z"), createdAt: new Date("2026-01-01") };
    expect(needsFollowUp(recruiter, NOW)).toBe(false);
  });

  it("is true once the threshold has passed since last contact", () => {
    const recruiter = { lastContactedAt: new Date("2026-06-08T00:00:00Z"), createdAt: new Date("2026-01-01") };
    expect(needsFollowUp(recruiter, NOW)).toBe(true);
  });

  it("falls back to createdAt when never contacted", () => {
    const recentlyCreated = { lastContactedAt: null, createdAt: new Date("2026-06-14T12:00:00Z") };
    expect(needsFollowUp(recentlyCreated, NOW)).toBe(false);

    const staleCreated = { lastContactedAt: null, createdAt: new Date("2026-05-01T12:00:00Z") };
    expect(needsFollowUp(staleCreated, NOW)).toBe(true);
  });

  it("is true when the latest linked email needs a reply, even if contact was recent", () => {
    const recruiter = { lastContactedAt: new Date("2026-06-15T00:00:00Z"), createdAt: new Date("2026-01-01") };
    expect(needsFollowUp(recruiter, NOW, undefined, true)).toBe(true);
  });

  it("stays true for a stale contact when the latest email doesn't need a reply", () => {
    const recruiter = { lastContactedAt: new Date("2026-06-08T00:00:00Z"), createdAt: new Date("2026-01-01") };
    expect(needsFollowUp(recruiter, NOW, undefined, false)).toBe(true);
  });

  it("stays false for a fresh contact when the latest email doesn't need a reply", () => {
    const recruiter = { lastContactedAt: new Date("2026-06-15T00:00:00Z"), createdAt: new Date("2026-01-01") };
    expect(needsFollowUp(recruiter, NOW, undefined, false)).toBe(false);
  });
});

function makeRecruiter(overrides: { id: string; lastContactedAt: Date | null; createdAt?: Date }): RecruiterWithEmails {
  return {
    id: overrides.id,
    userId: "user-1",
    name: "Test Recruiter",
    email: null,
    company: null,
    notes: null,
    lastContactedAt: overrides.lastContactedAt,
    createdAt: overrides.createdAt ?? new Date("2026-01-01"),
    emails: [],
  } as RecruiterWithEmails;
}

describe("splitByFollowUp", () => {
  it("buckets recruiters by follow-up status and sorts each bucket by staleness", () => {
    const stale = makeRecruiter({ id: "stale", lastContactedAt: new Date("2026-05-01T12:00:00Z") });
    const veryStale = makeRecruiter({ id: "very-stale", lastContactedAt: new Date("2026-04-01T12:00:00Z") });
    const fresh = makeRecruiter({ id: "fresh", lastContactedAt: new Date("2026-06-14T12:00:00Z") });
    const fresher = makeRecruiter({ id: "fresher", lastContactedAt: new Date("2026-06-15T00:00:00Z") });

    const { needsFollowUp, upToDate } = splitByFollowUp([stale, fresh, veryStale, fresher], NOW);

    expect(needsFollowUp.map((r) => r.id)).toEqual(["very-stale", "stale"]);
    expect(upToDate.map((r) => r.id)).toEqual(["fresher", "fresh"]);
  });
});
