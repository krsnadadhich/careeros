import { describe, expect, it } from "vitest";
import { CandidateProfileFormSchema } from "@/features/resume/schema";

describe("CandidateProfileFormSchema", () => {
  it("accepts a fully valid payload", () => {
    const result = CandidateProfileFormSchema.safeParse({
      headline: "AI Engineer",
      yearsExperience: "3",
      targetRoles: "AI Engineer, GenAI Engineer",
      targetLocations: "Bangalore, Remote",
      skills: "Python, LLMs",
      minSalary: "1200000",
      maxSalary: "1800000",
      remoteOnly: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an entirely empty (all-optional) payload", () => {
    expect(CandidateProfileFormSchema.safeParse({}).success).toBe(true);
  });

  it("rejects minSalary greater than maxSalary", () => {
    const result = CandidateProfileFormSchema.safeParse({
      minSalary: "2000000",
      maxSalary: "1000000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative yearsExperience", () => {
    const result = CandidateProfileFormSchema.safeParse({ yearsExperience: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects a yearsExperience above the sanity cap", () => {
    const result = CandidateProfileFormSchema.safeParse({ yearsExperience: "200" });
    expect(result.success).toBe(false);
  });
});
