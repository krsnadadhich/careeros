import { describe, expect, it } from "vitest";
import { buildResumeText } from "@/lib/matching/resume-text";

describe("buildResumeText", () => {
  it("uses the real resume text verbatim when present", () => {
    const text = buildResumeText({
      resume: { rawText: "John Doe, Senior AI Engineer with 5 years experience." },
      profile: { headline: null, yearsExperience: null, targetRoles: [], skills: [] },
    });
    expect(text).toBe("John Doe, Senior AI Engineer with 5 years experience.");
  });

  it("synthesizes a fallback from profile fields when there's no resume", () => {
    const text = buildResumeText({
      resume: null,
      profile: {
        headline: "AI Engineer",
        yearsExperience: 3,
        targetRoles: ["AI Engineer", "GenAI Engineer"],
        skills: ["Python", "RAG"],
      },
    });
    expect(text).toContain("AI Engineer");
    expect(text).toContain("3");
    expect(text).toContain("Python, RAG");
  });

  it("falls back to profile fields when the resume has no rawText", () => {
    const text = buildResumeText({
      resume: { rawText: null },
      profile: { headline: "AI Engineer", yearsExperience: null, targetRoles: [], skills: [] },
    });
    expect(text).toContain("AI Engineer");
  });

  it("never returns an empty string, even with no data at all", () => {
    const text = buildResumeText({
      resume: null,
      profile: { headline: null, yearsExperience: null, targetRoles: [], skills: [] },
    });
    expect(text.length).toBeGreaterThan(0);
  });
});
