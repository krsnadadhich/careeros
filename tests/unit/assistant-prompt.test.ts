import { describe, expect, it } from "vitest";
import { buildAssistantSystemPrompt } from "@/features/assistant/prompt";

describe("buildAssistantSystemPrompt", () => {
  it("embeds the context digest verbatim", () => {
    const prompt = buildAssistantSystemPrompt("## Recent Emails\nNo emails synced yet.");
    expect(prompt).toContain("## Recent Emails\nNo emails synced yet.");
  });

  it("instructs the model to ground answers only in the given context", () => {
    const prompt = buildAssistantSystemPrompt("some context");
    expect(prompt).toMatch(/only.*context/i);
    expect(prompt).toMatch(/don't have that information|not.*guess/i);
  });

  it("explicitly forbids claiming to perform actions on the user's behalf", () => {
    const prompt = buildAssistantSystemPrompt("some context");
    expect(prompt).toMatch(/cannot perform any actions/i);
    expect(prompt).toMatch(/send emails/i);
    expect(prompt).toMatch(/submit.*applications/i);
  });
});
