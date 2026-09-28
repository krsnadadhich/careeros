import { z } from "zod";

export const EmailCategoryEnum = z.enum([
  "JOBS",
  "RECRUITERS",
  "INTERVIEWS",
  "ASSESSMENTS",
  "OFFERS",
  "REJECTION",
  "OTHER",
]);

export const EmailClassificationSchema = z.object({
  category: EmailCategoryEnum,
  priority: z.enum(["HIGH", "MEDIUM", "LOW", "CRITICAL"]),
  importanceScore: z.number().min(0).max(100),
  actionRequired: z.boolean(),
  summary: z.string(),
});
export type EmailClassification = z.infer<typeof EmailClassificationSchema>;

export const ExtractedEmailDataSchema = z.object({
  company: z.string().nullable(),
  role: z.string().nullable(),
  applicationStage: z.string().nullable(),
  interviewDate: z.string().nullable(),
  assessmentDeadline: z.string().nullable(),
  recruiterName: z.string().nullable(),
  recruiterEmail: z.string().nullable(),
  location: z.string().nullable(),
  salary: z.string().nullable(),
  actionRequired: z.boolean(),
});
export type ExtractedEmailData = z.infer<typeof ExtractedEmailDataSchema>;

export const ParsedResumeSchema = z.object({
  skills: z.array(z.string()),
  experience: z.array(z.string()),
  education: z.array(z.string()),
  projects: z.array(z.string()),
  certifications: z.array(z.string()),
  experienceLevel: z.string().nullable(),
  /** 1-3 job titles this resume's actual content genuinely supports —
   * used to auto-fill CandidateProfile.targetRoles on upload instead of
   * requiring the user to hand-type them. Never invented beyond what the
   * resume shows. */
  suggestedRoles: z.array(z.string()),
  /** One-line professional headline (e.g. "AI Engineer with 2 years in
   * NLP") — auto-fills CandidateProfile.headline on upload. */
  headline: z.string().nullable(),
  /** Estimated total years of professional experience from the resume's
   * work history — auto-fills CandidateProfile.yearsExperience on
   * upload. null when the resume gives no real basis to estimate from
   * (e.g. no work history at all — a fresher's resume should get 0, not
   * a guessed number). */
  yearsExperience: z.number().nullable(),
});
export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

export const JobMatchResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  skillsScore: z.number().min(0).max(100),
  experienceScore: z.number().min(0).max(100),
  roleScore: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  rationale: z.string(),
});
export type JobMatchResult = z.infer<typeof JobMatchResultSchema>;

export const SkillGapAnalysisSchema = z.object({
  gaps: z.array(
    z.object({
      skill: z.string(),
      frequency: z.number(),
      have: z.boolean(),
    })
  ),
});
export type SkillGapAnalysis = z.infer<typeof SkillGapAnalysisSchema>;

export const JobRequiredSkillsSchema = z.object({ skills: z.array(z.string()) });
export type JobRequiredSkills = z.infer<typeof JobRequiredSkillsSchema>;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Every AI-backed feature in CareerOS goes through this interface so no
 * feature code depends on a specific model vendor. Implementations must
 * validate their own output against the zod schemas above rather than
 * trusting raw model output.
 */
export interface AIProvider {
  readonly name: string;

  /** Cheap connectivity/health check — used by Settings/System Status. */
  ping(): Promise<boolean>;

  /** Free-form chat, used by the "Ask AI" assistant panel. */
  chat(messages: ChatMessage[]): Promise<string>;

  /** Generates the one-line `aiSummary` shown on an email. Split out from
   * `classifyEmail` because Laya (a non-generative classifier — see
   * src/lib/laya) can answer everything else classifyEmail returns but
   * cannot produce free text; this is called lazily, only when a user
   * opens an email whose summary hasn't been generated yet. */
  summarizeEmail(input: { subject: string; body: string }): Promise<string>;

  classifyEmail(input: {
    subject: string;
    sender: string;
    body: string;
  }): Promise<EmailClassification>;

  extractEmailData(input: {
    subject: string;
    body: string;
  }): Promise<ExtractedEmailData>;

  parseResume(input: { rawText: string }): Promise<ParsedResume>;

  matchJob(input: {
    resumeText: string;
    jobDescription: string;
  }): Promise<JobMatchResult>;

  generateInterviewPrep(input: {
    jobDescription: string;
    role: string;
  }): Promise<string>;

  generateFollowup(input: { context: string }): Promise<string>;

  analyzeSkillGaps(input: {
    resumeSkills: string[];
    targetJobSkills: string[];
  }): Promise<SkillGapAnalysis>;

  /** Extracts the specific skills/tools/technologies a job posting asks
   * for, as a plain list — no Laya-first branch exists for this (Laya's
   * choice/score/noul question types can't produce open-ended list
   * output), so this is a deliberate, Ollama-only exception to this
   * codebase's usual Laya-first pattern. Frequency counting across many
   * jobs is done deterministically in TypeScript afterward (see
   * lib/skills/gap.ts), not by this call. */
  extractJobSkills(input: { jobDescription: string }): Promise<string[]>;

  /** Drafts application materials (tailored summary, cover letter, and
   * answers to common screening questions) for the user to review and take
   * with them when they apply themselves — never submitted anywhere by
   * the app (spec section 16: no auto-apply). */
  generateApplicationBrief(input: {
    resumeText: string;
    jobDescription: string;
    role: string;
    company: string;
  }): Promise<string>;
}
