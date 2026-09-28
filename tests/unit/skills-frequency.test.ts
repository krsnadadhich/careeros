import { describe, expect, it } from "vitest";
import { computeSkillFrequencies } from "@/lib/skills/frequency";

describe("computeSkillFrequencies", () => {
  it("counts how often each skill was matched vs merely considered, across matches", () => {
    const result = computeSkillFrequencies([
      { matchedSkills: ["Python", "AWS"], missingSkills: ["Rust"] },
      { matchedSkills: ["Python"], missingSkills: ["AWS", "Rust"] },
      { matchedSkills: [], missingSkills: ["Python"] },
    ]);

    const bySkill = Object.fromEntries(result.map((r) => [r.skill, r]));
    expect(bySkill.Python).toEqual({ skill: "Python", matchedCount: 2, totalCount: 3, relevance: 67 });
    expect(bySkill.AWS).toEqual({ skill: "AWS", matchedCount: 1, totalCount: 2, relevance: 50 });
    expect(bySkill.Rust).toEqual({ skill: "Rust", matchedCount: 0, totalCount: 2, relevance: 0 });
  });

  it("sorts by total consideration count first, then relevance", () => {
    const result = computeSkillFrequencies([
      { matchedSkills: ["A"], missingSkills: [] },
      { matchedSkills: ["B"], missingSkills: [] },
      { matchedSkills: ["B"], missingSkills: [] },
    ]);
    expect(result.map((r) => r.skill)).toEqual(["B", "A"]);
  });

  it("returns an empty array for no job matches", () => {
    expect(computeSkillFrequencies([])).toEqual([]);
  });
});
