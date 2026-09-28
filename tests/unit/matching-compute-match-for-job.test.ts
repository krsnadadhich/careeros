import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AIProvider } from "@/lib/ai/types";

const scoreJobWithLayaMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/laya/score-job", () => ({ scoreJobWithLaya: scoreJobWithLayaMock }));

const { computeMatchForJob } = await import("@/lib/matching/match-job");

function fakeProvider(matchJob: AIProvider["matchJob"], extractJobSkills?: AIProvider["extractJobSkills"]): AIProvider {
  return { matchJob, extractJobSkills: extractJobSkills ?? (async () => []) } as unknown as AIProvider;
}

const job = {
  role: "AI Engineer",
  company: "Acme",
  location: "Bangalore",
  remote: false,
  description: "We need Python and RAG experience.",
};
const profile = { skills: ["Python", "RAG", "Kubernetes"], targetLocations: ["Bangalore"] };

describe("computeMatchForJob", () => {
  beforeEach(() => {
    scoreJobWithLayaMock.mockReset();
    scoreJobWithLayaMock.mockResolvedValue(null); // falls through to the AI provider by default
  });

  it("uses laya's result when confident, and never calls the AI provider", async () => {
    scoreJobWithLayaMock.mockResolvedValueOnce({
      result: { experienceScore: 75, roleScore: 60, rationale: "Experience: a good match. Role fit: a partial fit." },
      confidences: [0.9, 0.85],
    });
    const matchJob = vi.fn();
    const ai = fakeProvider(matchJob);

    const result = await computeMatchForJob({ job, profile, resumeText: "resume text", ai });

    expect(matchJob).not.toHaveBeenCalled();
    expect(result.experienceScore).toBe(75);
    expect(result.roleScore).toBe(60);
    expect(result.rationale).toContain("Experience: a good match. Role fit: a partial fit.");
    expect(result.rationale).toContain("Location:");
  });

  it("keeps the AI's experience/role/rationale but discards its skills output", async () => {
    const ai = fakeProvider(async () => ({
      overallScore: 10, // should be ignored — recomputed from the blend
      skillsScore: 10, // should be ignored — deterministic value used instead
      experienceScore: 88,
      roleScore: 92,
      matchedSkills: ["totally-wrong-llm-guess"],
      missingSkills: ["also-wrong"],
      rationale: "Strong experience fit.",
    }));

    const result = await computeMatchForJob({ job, profile, resumeText: "resume text", ai });

    expect(result.experienceScore).toBe(88);
    expect(result.roleScore).toBe(92);
    expect(result.rationale).toContain("Strong experience fit.");
    // deterministic skills computation, NOT the fake's values
    expect(result.matchedSkills).toEqual(["Python", "RAG"]);
    expect(result.missingSkills).toEqual(["Kubernetes"]);
    expect(result.skillsScore).not.toBe(10);
  });

  it("falls back to neutral scores when the AI provider throws", async () => {
    const ai = fakeProvider(async () => {
      throw new Error("Not implemented until a later phase");
    });

    const result = await computeMatchForJob({ job, profile, resumeText: "resume text", ai });

    expect(result.experienceScore).toBe(50);
    expect(result.roleScore).toBe(50);
    expect(result.rationale).toContain("wasn't available");
    // deterministic parts still computed even when AI fails
    expect(result.matchedSkills).toEqual(["Python", "RAG"]);
  });

  it("appends a deterministic location sentence to the rationale", async () => {
    const ai = fakeProvider(async () => ({
      overallScore: 0,
      skillsScore: 0,
      experienceScore: 70,
      roleScore: 70,
      matchedSkills: [],
      missingSkills: [],
      rationale: "Solid fit.",
    }));

    const result = await computeMatchForJob({ job, profile, resumeText: "resume text", ai });
    expect(result.rationale).toContain("Location:");
  });

  it("includes the numeric locationScore in the return value, matching computeLocationScore's own output", async () => {
    const ai = fakeProvider(async () => ({
      overallScore: 0,
      skillsScore: 0,
      experienceScore: 50,
      roleScore: 50,
      matchedSkills: [],
      missingSkills: [],
      rationale: "Fine.",
    }));

    const result = await computeMatchForJob({ job, profile, resumeText: "resume text", ai });
    // job.location "Bangalore" overlaps profile.targetLocations ["Bangalore"] -> 100
    expect(result.locationScore).toBe(100);
    expect(result.locationLabel).toBe("matches your target locations");
  });

  it("populates requiredSkills from the AI provider's extractJobSkills", async () => {
    const ai = fakeProvider(
      async () => ({
        overallScore: 0,
        skillsScore: 0,
        experienceScore: 50,
        roleScore: 50,
        matchedSkills: [],
        missingSkills: [],
        rationale: "Fine.",
      }),
      async () => ["Python", "Kubernetes"]
    );

    const result = await computeMatchForJob({ job, profile, resumeText: "resume text", ai });
    expect(result.requiredSkills).toEqual(["Python", "Kubernetes"]);
  });

  it("defaults requiredSkills to an empty array when extractJobSkills throws, without failing the match", async () => {
    const ai = fakeProvider(
      async () => ({
        overallScore: 0,
        skillsScore: 0,
        experienceScore: 50,
        roleScore: 50,
        matchedSkills: [],
        missingSkills: [],
        rationale: "Fine.",
      }),
      async () => {
        throw new Error("extraction failed");
      }
    );

    const result = await computeMatchForJob({ job, profile, resumeText: "resume text", ai });
    expect(result.requiredSkills).toEqual([]);
    expect(result.experienceScore).toBe(50);
  });
});
