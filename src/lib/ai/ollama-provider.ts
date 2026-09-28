import { z } from "zod";
import {
  EmailClassificationSchema,
  ExtractedEmailDataSchema,
  JobMatchResultSchema,
  ParsedResumeSchema,
  SkillGapAnalysisSchema,
  JobRequiredSkillsSchema,
  type AIProvider,
  type ChatMessage,
  type EmailClassification,
  type ExtractedEmailData,
  type JobMatchResult,
  type ParsedResume,
  type SkillGapAnalysis,
} from "./types";

/**
 * Calls a locally-running Ollama server (https://ollama.com). No API key,
 * no data leaves the machine. Structured-output methods are thin `chat()`
 * wrappers with a "respond with JSON only" instruction, validated against
 * the shared zod schemas — the model is never trusted blindly. Real prompt
 * engineering per method is a later-phase concern; Phase 1 only proves the
 * plumbing works end-to-end.
 */
export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  private baseUrl: string;
  private model: string;

  constructor(options?: { baseUrl?: string; model?: string }) {
    this.baseUrl =
      options?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    this.model = options?.model ?? process.env.OLLAMA_MODEL ?? "llama3.2:3b";
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, messages, stream: false }),
    });
    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  }

  /** Asks for strict JSON, then validates against `schema`, falling back on
   * failure. `normalize` runs on the raw parsed JSON before validation —
   * small local models frequently ignore "array of strings" instructions
   * and return a bare string instead, which would otherwise fail
   * validation and silently trigger the fallback every time. */
  private async chatStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    fallback: T,
    normalize?: (raw: unknown) => unknown
  ): Promise<T> {
    try {
      const raw = await this.chat([
        {
          role: "system",
          content:
            "You respond with a single valid JSON object only. No prose, no markdown fences.",
        },
        { role: "user", content: prompt },
      ]);
      const jsonText = extractJson(raw);
      let parsedJson: unknown = JSON.parse(jsonText);
      if (normalize) parsedJson = normalize(parsedJson);
      const parsed = schema.safeParse(parsedJson);
      if (parsed.success) return parsed.data;
      console.warn("[ollama-provider] schema validation failed", parsed.error.message);
      return fallback;
    } catch (err) {
      console.warn("[ollama-provider] structured call failed", err);
      return fallback;
    }
  }

  async summarizeEmail(input: { subject: string; body: string }): Promise<string> {
    try {
      const text = await this.chat([
        {
          role: "system",
          content:
            "Summarize this email in one short, plain sentence for a job-search inbox. " +
            "State only what the email actually says — never guess a company name, date, " +
            "or outcome that isn't in the text.",
        },
        { role: "user", content: `Subject: ${input.subject}\nBody: ${input.body.slice(0, 2000)}` },
      ]);
      return text.trim() || "Could not summarize this email.";
    } catch (err) {
      console.warn("[ollama-provider] summarizeEmail failed", err);
      return "Could not summarize this email.";
    }
  }

  async classifyEmail(input: {
    subject: string;
    sender: string;
    body: string;
  }): Promise<EmailClassification> {
    return this.chatStructured(
      `Classify this email. Return JSON: {"category": one of JOBS|RECRUITERS|INTERVIEWS|ASSESSMENTS|OFFERS|REJECTION|OTHER, "priority": one of HIGH|MEDIUM|LOW|CRITICAL, "importanceScore": integer 0-100, "actionRequired": boolean, "summary": short string}.\n\nFrom: ${input.sender}\nSubject: ${input.subject}\nBody: ${input.body.slice(0, 2000)}`,
      EmailClassificationSchema,
      {
        category: "OTHER",
        priority: "LOW",
        importanceScore: 0,
        actionRequired: false,
        summary: "Could not classify this email.",
      }
    );
  }

  async extractEmailData(input: {
    subject: string;
    body: string;
  }): Promise<ExtractedEmailData> {
    return this.chatStructured(
      `Extract structured data from this email as JSON with keys: company, role, applicationStage, interviewDate, assessmentDeadline, recruiterName, recruiterEmail, location, salary (all string or null), actionRequired (boolean).\n\nSubject: ${input.subject}\nBody: ${input.body.slice(0, 2000)}`,
      ExtractedEmailDataSchema,
      {
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
      }
    );
  }

  async parseResume(input: { rawText: string }): Promise<ParsedResume> {
    return this.chatStructured(
      `Parse this resume text into JSON: {"skills": string[] (every distinct technical skill, tool, language, framework, and technology mentioned anywhere in the resume — scan the entire text including any skills/tools section near the end, don't stop after the first few), "experience": string[], "education": string[], "projects": string[], "certifications": string[], "experienceLevel": string or null, "suggestedRoles": string[] (1-3 job titles this resume's actual skills and experience genuinely support — never invent a title beyond what the resume shows), "headline": string or null (a one-line professional headline for this candidate, e.g. "AI Engineer with 2 years in NLP" — based only on what the resume actually shows), "yearsExperience": number or null (estimated total years of professional work experience from the resume's work history — use 0 for a resume with no professional work history rather than null, and use null only if you truly cannot tell)}.\n\nResume:\n${input.rawText.slice(0, 10000)}`,
      ParsedResumeSchema,
      {
        skills: [],
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        experienceLevel: null,
        suggestedRoles: [],
        headline: null,
        yearsExperience: null,
      },
      (raw) =>
        coerceStringArrayFields(raw, [
          "skills",
          "experience",
          "education",
          "projects",
          "certifications",
          "suggestedRoles",
        ])
    );
  }

  async matchJob(input: {
    resumeText: string;
    jobDescription: string;
  }): Promise<JobMatchResult> {
    return this.chatStructured(
      `Score how well this resume matches this job. Return JSON: {"overallScore": 0-100, "skillsScore": 0-100, "experienceScore": 0-100, "roleScore": 0-100, "matchedSkills": string[], "missingSkills": string[], "rationale": short string}.\n\nResume:\n${input.resumeText.slice(0, 3000)}\n\nJob description:\n${input.jobDescription.slice(0, 3000)}`,
      JobMatchResultSchema,
      {
        overallScore: 0,
        skillsScore: 0,
        experienceScore: 0,
        roleScore: 0,
        matchedSkills: [],
        missingSkills: [],
        rationale: "Could not compute a match score.",
      },
      (raw) => coerceStringArrayFields(raw, ["matchedSkills", "missingSkills"])
    );
  }

  async generateInterviewPrep(input: {
    jobDescription: string;
    role: string;
  }): Promise<string> {
    return this.chat([
      {
        role: "system",
        content:
          "You are helping a candidate prepare for a job interview. Write a grounded, honest " +
          "preparation brief using ONLY the context given — never invent company facts, prior " +
          "conversations, or interview rounds that aren't in the input. If a section has no " +
          "supporting context, say so plainly instead of guessing. Structure your response with " +
          "these labeled sections: Company & Role Brief, Previous Communication Summary, " +
          "Previously Asked Questions, Likely Next Topics, Relevant Projects To Highlight, " +
          "Suggested Questions To Ask, Preparation Checklist.",
      },
      {
        role: "user",
        content: `Role: ${input.role}\n\n${input.jobDescription.slice(0, 6000)}`,
      },
    ]);
  }

  async generateApplicationBrief(input: {
    resumeText: string;
    jobDescription: string;
    role: string;
    company: string;
  }): Promise<string> {
    return this.chat([
      {
        role: "system",
        content:
          "You are helping a candidate prepare application materials for a specific job, using " +
          "ONLY their real resume and the real job description given — never invent employers, " +
          "job titles, dates, or skills that aren't in the resume text. Structure your response " +
          "with these labeled sections: Tailored Summary (2-3 sentences connecting this " +
          "candidate's real background to this specific role), Cover Letter (a short, concrete " +
          "draft — no generic filler, reference real details from both the resume and the job " +
          "description), Draft Answers To Common Questions (brief draft answers for: Why are you " +
          "interested in this role?, Walk me through your relevant experience, and What are your " +
          "salary expectations? — for salary, say the candidate should fill this in themselves " +
          "rather than guessing a number). This is a draft for the candidate to review and edit " +
          "before applying themselves — it is never submitted automatically.",
      },
      {
        role: "user",
        content: `Role: ${input.role}\nCompany: ${input.company}\n\nJob description:\n${input.jobDescription.slice(0, 4000)}\n\nCandidate resume:\n${input.resumeText.slice(0, 4000)}`,
      },
    ]);
  }

  async generateFollowup(input: { context: string }): Promise<string> {
    return this.chat([
      {
        role: "user",
        content: `Draft a short, polite follow-up message. Context: ${input.context}`,
      },
    ]);
  }

  async analyzeSkillGaps(input: {
    resumeSkills: string[];
    targetJobSkills: string[];
  }): Promise<SkillGapAnalysis> {
    return this.chatStructured(
      `Given candidate skills ${JSON.stringify(input.resumeSkills)} and target job skills ${JSON.stringify(input.targetJobSkills)}, return JSON: {"gaps": [{"skill": string, "frequency": number, "have": boolean}]}.`,
      SkillGapAnalysisSchema,
      { gaps: [] }
    );
  }

  async extractJobSkills(input: { jobDescription: string }): Promise<string[]> {
    const result = await this.chatStructured(
      `List the specific technical skills, tools, and technologies this job posting requires. Return JSON: {"skills": string[]}.\n\nJob description:\n${input.jobDescription.slice(0, 3000)}`,
      JobRequiredSkillsSchema,
      { skills: [] },
      (raw) => coerceStringArrayFields(raw, ["skills"])
    );
    return result.skills;
  }
}

/** Strips markdown code fences a model may still wrap JSON in despite instructions. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

/** Small local models frequently return a bare string (or omit the field)
 * where the prompt asked for an array of strings. Coerces each named field
 * on `raw` into a string array — splitting a string on common list
 * delimiters — before schema validation, so a technically-off-format but
 * still-useful response doesn't get thrown away wholesale. Leaves fields
 * that are already arrays, or missing entirely, untouched. */
export function coerceStringArrayFields(raw: unknown, fields: string[]): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  for (const field of fields) {
    const value = obj[field];
    if (Array.isArray(value) || value === undefined) continue;
    if (typeof value === "string") {
      obj[field] = value
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return obj;
}
