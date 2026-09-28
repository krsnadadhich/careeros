import { describe, expect, it } from "vitest";
import { computeOverallScore, MATCH_WEIGHTS } from "@/lib/matching/weights";

describe("MATCH_WEIGHTS", () => {
  it("sums to 1.0", () => {
    const sum = MATCH_WEIGHTS.skills + MATCH_WEIGHTS.experience + MATCH_WEIGHTS.role + MATCH_WEIGHTS.location;
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe("computeOverallScore", () => {
  it("returns 100 when every component is 100", () => {
    expect(
      computeOverallScore({ skillsScore: 100, experienceScore: 100, roleScore: 100, locationScore: 100 })
    ).toBe(100);
  });

  it("returns 0 when every component is 0", () => {
    expect(
      computeOverallScore({ skillsScore: 0, experienceScore: 0, roleScore: 0, locationScore: 0 })
    ).toBe(0);
  });

  it("weights skills highest — a skills-only perfect score outweighs a location-only one", () => {
    const skillsOnly = computeOverallScore({ skillsScore: 100, experienceScore: 0, roleScore: 0, locationScore: 0 });
    const locationOnly = computeOverallScore({ skillsScore: 0, experienceScore: 0, roleScore: 0, locationScore: 100 });
    expect(skillsOnly).toBeGreaterThan(locationOnly);
  });

  it("computes a realistic blended example", () => {
    // 94*.35 + 90*.25 + 98*.25 + 100*.15 = 32.9 + 22.5 + 24.5 + 15 = 94.9 -> 95
    const score = computeOverallScore({
      skillsScore: 94,
      experienceScore: 90,
      roleScore: 98,
      locationScore: 100,
    });
    expect(score).toBe(95);
  });
});
