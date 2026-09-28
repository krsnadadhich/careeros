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
  "AnthropicProvider: structured methods are wired up in a later phase — chat()/ping() are real today.";

/**
 * Proves the AIProvider abstraction is truly pluggable beyond Ollama:
 * ping()/chat() make real calls when ANTHROPIC_API_KEY is set. The
 * structured methods (classification, matching, etc.) are intentionally
 * deferred to the phase that actually needs production-quality prompts.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private apiKey: string | undefined;
  private model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.model = options?.model ?? "claude-haiku-4-5";
  }

  async ping(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
    const system = messages.find((m) => m.role === "system")?.content;
    const rest = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system,
        messages: rest,
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.[0]?.text ?? "";
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
