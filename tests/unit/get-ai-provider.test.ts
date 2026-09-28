import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIProvider } from "@/lib/ai/get-ai-provider";

const ORIGINAL_ENV = process.env.AI_PROVIDER;

afterEach(() => {
  process.env.AI_PROVIDER = ORIGINAL_ENV;
  vi.unstubAllEnvs();
});

describe("getAIProvider", () => {
  it("defaults to mock when AI_PROVIDER is unset", () => {
    delete process.env.AI_PROVIDER;
    expect(getAIProvider().name).toBe("mock");
  });

  it("returns mock for AI_PROVIDER=mock", () => {
    process.env.AI_PROVIDER = "mock";
    expect(getAIProvider().name).toBe("mock");
  });

  it("returns ollama for AI_PROVIDER=ollama", () => {
    process.env.AI_PROVIDER = "ollama";
    expect(getAIProvider().name).toBe("ollama");
  });

  it("returns anthropic for AI_PROVIDER=anthropic", () => {
    process.env.AI_PROVIDER = "anthropic";
    expect(getAIProvider().name).toBe("anthropic");
  });

  it("returns openai for AI_PROVIDER=openai", () => {
    process.env.AI_PROVIDER = "openai";
    expect(getAIProvider().name).toBe("openai");
  });

  it("falls back to mock for an unknown provider name", () => {
    process.env.AI_PROVIDER = "not-a-real-provider";
    expect(getAIProvider().name).toBe("mock");
  });
});
