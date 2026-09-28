import { describe, expect, it } from "vitest";
import { buildSearchCombos } from "@/lib/jobs/adzuna";
import type { JobSearchCriteria } from "@/lib/jobs/types";

function criteria(overrides: Partial<JobSearchCriteria> = {}): JobSearchCriteria {
  return { roles: [], locations: [], remoteOnly: false, ...overrides };
}

describe("buildSearchCombos", () => {
  it("produces one combo per role when there are no locations", () => {
    const combos = buildSearchCombos(criteria({ roles: ["AI Engineer"] }));
    expect(combos).toEqual([["AI Engineer", null]]);
  });

  it("produces role x location combos", () => {
    const combos = buildSearchCombos(
      criteria({ roles: ["AI Engineer", "ML Engineer"], locations: ["Bangalore", "Remote"] })
    );
    expect(combos).toHaveLength(4);
    expect(combos).toContainEqual(["AI Engineer", "Bangalore"]);
    expect(combos).toContainEqual(["ML Engineer", "Remote"]);
  });

  it("skips locations entirely when remoteOnly is true (one call per role)", () => {
    const combos = buildSearchCombos(
      criteria({ roles: ["AI Engineer", "ML Engineer"], locations: ["Bangalore"], remoteOnly: true })
    );
    expect(combos).toEqual([
      ["AI Engineer", null],
      ["ML Engineer", null],
    ]);
  });

  it("caps roles and locations even when far more are configured", () => {
    const manyRoles = Array.from({ length: 10 }, (_, i) => `Role ${i}`);
    const manyLocations = Array.from({ length: 10 }, (_, i) => `City ${i}`);
    const combos = buildSearchCombos(criteria({ roles: manyRoles, locations: manyLocations }));
    // ROLE_CAP=3 x LOCATION_CAP=2 = 6, well under MAX_TOTAL_CALLS=8
    expect(combos.length).toBeLessThanOrEqual(8);
    expect(combos.length).toBe(6);
  });

  it("never exceeds the hard total-call ceiling even with a large role count and no locations", () => {
    const manyRoles = Array.from({ length: 10 }, (_, i) => `Role ${i}`);
    const combos = buildSearchCombos(criteria({ roles: manyRoles }));
    expect(combos.length).toBeLessThanOrEqual(8);
  });
});
