import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AIProvider, EmailClassification } from "@/lib/ai/types";

const classifyEmailWithLayaMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/laya/classify-email", () => ({ classifyEmailWithLaya: classifyEmailWithLayaMock }));

import { resolveEmailClassification } from "@/lib/gmail/classify-with-fallback";

const INPUT = { subject: "Interview scheduled", sender: "jordan@acme.com", body: "Are you free Thursday?" };

const LAYA_RESULT = {
  category: "INTERVIEWS" as const,
  priority: "HIGH" as const,
  importanceScore: 90,
  actionRequired: true,
};

function fakeAiProvider(classifyEmail: () => Promise<EmailClassification>): AIProvider {
  return {
    name: "fake",
    ping: async () => true,
    chat: async () => "",
    summarizeEmail: async () => "",
    classifyEmail,
    extractEmailData: async () => ({
      company: null,
      role: null,
      applicationStage: null,
      interviewDate: null,
      assessmentDeadline: null,
      recruiterName: null,
      recruiterEmail: null,
      location: null,
      salary: null,
      actionRequired: false,
    }),
    parseResume: async () => ({
      skills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      experienceLevel: null,
      suggestedRoles: [],
      headline: null,
      yearsExperience: null,
    }),
    matchJob: async () => ({ overallScore: 0, skillsScore: 0, experienceScore: 0, roleScore: 0, matchedSkills: [], missingSkills: [], rationale: "" }),
    generateInterviewPrep: async () => "",
    generateFollowup: async () => "",
    analyzeSkillGaps: async () => ({ gaps: [] }),
    generateApplicationBrief: async () => "",
    extractJobSkills: async () => [],
  };
}

describe("resolveEmailClassification", () => {
  beforeEach(() => {
    classifyEmailWithLayaMock.mockReset();
  });

  it("uses laya's result and leaves aiSummary null when laya succeeds with high confidence", async () => {
    classifyEmailWithLayaMock.mockResolvedValueOnce({ result: LAYA_RESULT, confidences: [0.9, 0.8, 0.85] });
    const ollamaClassifyEmail = vi.fn();
    const ai = fakeAiProvider(ollamaClassifyEmail);

    const result = await resolveEmailClassification(INPUT, ai);

    expect(result).toEqual({ ...LAYA_RESULT, aiSummary: null, source: "laya", confidence: 0.8 });
    expect(ollamaClassifyEmail).not.toHaveBeenCalled();
  });

  it("falls back to the AI provider when laya is unreachable (returns null)", async () => {
    classifyEmailWithLayaMock.mockResolvedValueOnce(null);
    const ollamaResult: EmailClassification = {
      category: "OTHER",
      priority: "LOW",
      importanceScore: 10,
      actionRequired: false,
      summary: "Ollama's own summary.",
    };
    const ollamaClassifyEmail = vi.fn().mockResolvedValueOnce(ollamaResult);
    const ai = fakeAiProvider(ollamaClassifyEmail);

    const result = await resolveEmailClassification(INPUT, ai);

    expect(ollamaClassifyEmail).toHaveBeenCalledWith(INPUT);
    expect(result).toEqual({
      category: "OTHER",
      priority: "LOW",
      importanceScore: 10,
      actionRequired: false,
      aiSummary: "Ollama's own summary.",
      source: "ollama",
      confidence: null,
    });
  });

  it("falls back to the AI provider when laya's confidence is too low", async () => {
    classifyEmailWithLayaMock.mockResolvedValueOnce({ result: LAYA_RESULT, confidences: [0.9, 0.3, 0.85] });
    const ollamaResult: EmailClassification = {
      category: "INTERVIEWS",
      priority: "MEDIUM",
      importanceScore: 50,
      actionRequired: true,
      summary: "Fallback summary.",
    };
    const ollamaClassifyEmail = vi.fn().mockResolvedValueOnce(ollamaResult);
    const ai = fakeAiProvider(ollamaClassifyEmail);

    const result = await resolveEmailClassification(INPUT, ai);

    expect(ollamaClassifyEmail).toHaveBeenCalledTimes(1);
    expect(result.aiSummary).toBe("Fallback summary.");
  });

  it("reports the ollama fallback's confidence as null", async () => {
    classifyEmailWithLayaMock.mockResolvedValueOnce(null);
    const ollamaClassifyEmail = vi.fn().mockResolvedValueOnce({
      category: "OTHER",
      priority: "LOW",
      importanceScore: 10,
      actionRequired: false,
      summary: "s",
    });
    const ai = fakeAiProvider(ollamaClassifyEmail);

    const result = await resolveEmailClassification(INPUT, ai);

    expect(result.source).toBe("ollama");
    expect(result.confidence).toBeNull();
  });

  it("reports laya's confidence as the minimum of its per-question confidences", async () => {
    classifyEmailWithLayaMock.mockResolvedValueOnce({ result: LAYA_RESULT, confidences: [0.95, 0.61, 0.99] });
    const ai = fakeAiProvider(vi.fn());

    const result = await resolveEmailClassification(INPUT, ai);

    expect(result.source).toBe("laya");
    expect(result.confidence).toBe(0.61);
  });
});
