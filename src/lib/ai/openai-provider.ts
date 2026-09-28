import type {
  AIProvider,
  ChatMessage,
  EmailClassification,
  ExtractedEmailData,
  JobMatchResult,
  ParsedResume,
  SkillGapAnalysis,
} from "./types";

const NOT_IMPLEMENTED =
  "OpenAIProvider: structured methods are wired up in a later phase — chat()/ping() are real today.";

/** Mirror of AnthropicProvider for OpenAI — see that file for the rationale. */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private apiKey: string | undefined;
  private model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = options?.model ?? "gpt-4o-mini";
  }

  async ping(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, messages }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  }

  async summarizeEmail(): Promise<string> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async classifyEmail(): Promise<EmailClassification> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async extractEmailData(): Promise<ExtractedEmailData> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async parseResume(): Promise<ParsedResume> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async matchJob(): Promise<JobMatchResult> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async generateInterviewPrep(): Promise<string> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async generateFollowup(): Promise<string> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async analyzeSkillGaps(): Promise<SkillGapAnalysis> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async generateApplicationBrief(): Promise<string> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async extractJobSkills(): Promise<string[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
