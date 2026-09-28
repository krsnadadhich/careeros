import type {
  AIProvider,
  ChatMessage,
  EmailClassification,
  ExtractedEmailData,
  JobMatchResult,
  ParsedResume,
  SkillGapAnalysis,
} from "./types";

/**
 * Deterministic, clearly-labeled-fake provider. Used whenever no real model
 * backend is configured, so the UI can always be developed/tested without
 * API keys or a local model running. Every value is schema-shaped but
 * unmistakably marked "[mock]" so it's never confused with real output.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";

  async ping(): Promise<boolean> {
    return true;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    return `[mock] No AI provider configured. You asked: "${last}"`;
  }

  async summarizeEmail(): Promise<string> {
    return "[mock] Email summarization is not live — configure AI_PROVIDER.";
  }

  async classifyEmail(): Promise<EmailClassification> {
    return {
      category: "OTHER",
      priority: "LOW",
      importanceScore: 0,
      actionRequired: false,
      summary: "[mock] Email classification is not live — configure AI_PROVIDER.",
    };
  }

  async extractEmailData(): Promise<ExtractedEmailData> {
    return {
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
    };
  }

  async parseResume(): Promise<ParsedResume> {
    return {
      skills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      experienceLevel: null,
      suggestedRoles: [],
      headline: null,
      yearsExperience: null,
    };
  }

  async matchJob(): Promise<JobMatchResult> {
    return {
      overallScore: 0,
      skillsScore: 0,
      experienceScore: 0,
      roleScore: 0,
      matchedSkills: [],
      missingSkills: [],
      rationale: "[mock] Job matching is not live — configure AI_PROVIDER.",
    };
  }

  async generateInterviewPrep(): Promise<string> {
    return "[mock] Interview prep is not live — configure AI_PROVIDER.";
  }

  async generateFollowup(): Promise<string> {
    return "[mock] Follow-up drafting is not live — configure AI_PROVIDER.";
  }

  async analyzeSkillGaps(): Promise<SkillGapAnalysis> {
    return { gaps: [] };
  }
  async generateApplicationBrief(): Promise<string> {
    return "[mock] Application brief generation is not live — configure AI_PROVIDER.";
  }
  async extractJobSkills(): Promise<string[]> {
    return [];
  }
}
