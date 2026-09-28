import { describe, expect, it } from "vitest";
import { computeSkillGaps, tierForGapPercent } from "@/lib/skills/gap";

describe("computeSkillGaps", () => {
  it("counts a required skill absent from the candidate's skills as a gap", () => {
    const result = computeSkillGaps([{ requiredSkills: ["Kubernetes"] }], ["Python", "React"]);
    expect(result).toEqual([{ skill: "Kubernetes", jobCount: 1, totalJobs: 1 }]);
  });

  it("does not count a required skill the candidate already has", () => {
    const result = computeSkillGaps([{ requiredSkills: ["Python"] }], ["Python"]);
    expect(result).toEqual([]);
  });

  it("uses boundary-aware matching so 'Go' inside 'Google' or 'Django' isn't a false match", () => {
    // candidate has "Go" — a job requiring "Django" should still be a real gap
    const result = computeSkillGaps([{ requiredSkills: ["Django"] }], ["Go"]);
    expect(result).toEqual([{ skill: "Django", jobCount: 1, totalJobs: 1 }]);
  });

  it("handles symbol-containing skills like C++/Node.js correctly", () => {
    const result = computeSkillGaps([{ requiredSkills: ["C++", "Node.js"] }], ["C++"]);
    expect(result).toEqual([{ skill: "Node.js", jobCount: 1, totalJobs: 1 }]);
  });

  it("ranks gaps by how many matched jobs ask for them, descending", () => {
    const result = computeSkillGaps(
      [
        { requiredSkills: ["Rust", "Go"] },
        { requiredSkills: ["Rust"] },
        { requiredSkills: ["Rust", "Go"] },
      ],
      []
    );
    expect(result.map((r) => r.skill)).toEqual(["Rust", "Go"]);
    expect(result[0]).toEqual({ skill: "Rust", jobCount: 3, totalJobs: 3 });
    expect(result[1]).toEqual({ skill: "Go", jobCount: 2, totalJobs: 3 });
  });

  it("only counts jobs with non-empty requiredSkills toward totalJobs", () => {
    const result = computeSkillGaps([{ requiredSkills: ["Rust"] }, { requiredSkills: [] }], []);
    expect(result).toEqual([{ skill: "Rust", jobCount: 1, totalJobs: 1 }]);
  });

  it("returns an empty array for no job matches", () => {
    expect(computeSkillGaps([], ["Python"])).toEqual([]);
  });
});

describe("tierForGapPercent", () => {
  it("is Occasional just under 20%, Common at 20%", () => {
    expect(tierForGapPercent(19)).toBe("Occasional");
    expect(tierForGapPercent(20)).toBe("Common");
  });
  it("is Common just under 50%, Critical at 50%", () => {
    expect(tierForGapPercent(49)).toBe("Common");
    expect(tierForGapPercent(50)).toBe("Critical");
  });
});
