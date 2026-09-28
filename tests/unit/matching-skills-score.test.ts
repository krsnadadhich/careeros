import { describe, expect, it } from "vitest";
import { computeSkillsScore, containsSkillMention } from "@/lib/matching/skills";

describe("containsSkillMention", () => {
  it("matches case-insensitively", () => {
    expect(containsSkillMention("python", "Experience with Python required.")).toBe(true);
  });

  it("does not match 'Go' inside 'Google' (prefix-embedded substring)", () => {
    expect(containsSkillMention("Go", "Experience with Google Cloud.")).toBe(false);
  });

  it("does not match 'Go' inside 'Django' (suffix-embedded substring)", () => {
    expect(containsSkillMention("Go", "Django developer wanted.")).toBe(false);
  });

  it("matches 'Go' as a genuine whole-token mention", () => {
    expect(containsSkillMention("Go", "Write Go services for our backend.")).toBe(true);
  });

  it("matches symbol-containing skills as whole tokens", () => {
    expect(containsSkillMention("C++", "Looking for a C++ backend engineer.")).toBe(true);
    expect(containsSkillMention("Node.js", "Node.js experience required.")).toBe(true);
  });

  it("does not false-positive symbol skills embedded in a longer token", () => {
    expect(containsSkillMention("Node.js", "NodeJSVeteran is not the same token.")).toBe(false);
  });

  it("matches a multi-word skill phrase", () => {
    expect(containsSkillMention("Machine Learning", "3 years of Machine Learning experience.")).toBe(true);
    expect(containsSkillMention("Machine Learning", "Learning new machines is fun.")).toBe(false);
  });

  it("returns false for an empty skill", () => {
    expect(containsSkillMention("", "anything")).toBe(false);
    expect(containsSkillMention("   ", "anything")).toBe(false);
  });
});

describe("computeSkillsScore", () => {
  it("returns 0 and empty arrays for an empty candidate skill list", () => {
    expect(computeSkillsScore([], "Python, RAG, LangChain")).toEqual({
      skillsScore: 0,
      matchedSkills: [],
      missingSkills: [],
    });
  });

  it("splits skills into matched/missing and computes a percentage score", () => {
    const result = computeSkillsScore(
      ["Python", "RAG", "Kubernetes"],
      "We need Python and RAG experience."
    );
    expect(result.matchedSkills).toEqual(["Python", "RAG"]);
    expect(result.missingSkills).toEqual(["Kubernetes"]);
    expect(result.skillsScore).toBe(67); // 2/3 rounded
  });

  it("does not drop an absent skill silently", () => {
    const result = computeSkillsScore(["Rust"], "We use Python here.");
    expect(result.missingSkills).toContain("Rust");
    expect(result.matchedSkills).toEqual([]);
  });

  it("caps the denominator so a long resume isn't penalized for skills irrelevant to this job", () => {
    // 20 candidate skills, but this job's text only asks for 2 of them —
    // matching everything the job actually mentions should score high,
    // not ~10% just because the resume also lists 18 unrelated skills.
    const candidateSkills = ["Python", "RAG", ...Array.from({ length: 18 }, (_, i) => `Skill${i}`)];
    const result = computeSkillsScore(candidateSkills, "We need Python and RAG experience.");
    expect(result.matchedSkills).toEqual(["Python", "RAG"]);
    expect(result.skillsScore).toBe(25); // 2/8 (capped denominator), not 2/20
  });

  it("still reaches 100% when matched skills meet the cap, even with more unmatched skills beyond it", () => {
    const candidateSkills = [
      "Python", "RAG", "LangChain", "SQL", "AWS", "Docker", "Kubernetes", "Git",
      ...Array.from({ length: 10 }, (_, i) => `Unrelated${i}`),
    ];
    const jobText = "Python, RAG, LangChain, SQL, AWS, Docker, Kubernetes, Git — all required.";
    const result = computeSkillsScore(candidateSkills, jobText);
    expect(result.skillsScore).toBe(100);
  });

  it("does not apply the cap for a short candidate skill list (denominator stays the real count)", () => {
    const result = computeSkillsScore(["Python", "RAG", "Kubernetes"], "We need Python experience.");
    expect(result.skillsScore).toBe(33); // 1/3, not 1/8
  });
});
