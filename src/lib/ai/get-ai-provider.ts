import type { AIProvider } from "./types";
import { MockProvider } from "./mock-provider";
import { OllamaProvider } from "./ollama-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { OpenAIProvider } from "./openai-provider";

export type AIProviderName = "mock" | "ollama" | "anthropic" | "openai";

/**
 * Single place that decides which AIProvider backs the app, driven by the
 * AI_PROVIDER env var. Nothing outside src/lib/ai should import a concrete
 * provider class directly — always go through this factory (or an injected
 * instance in tests).
 */
export function getAIProvider(): AIProvider {
  const configured = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

  switch (configured) {
    case "ollama":
      return new OllamaProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "mock":
      return new MockProvider();
    default:
      console.warn(
        `[get-ai-provider] Unknown AI_PROVIDER "${configured}", falling back to mock.`
      );
      return new MockProvider();
  }
}
