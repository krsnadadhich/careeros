"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getAIProvider } from "@/lib/ai/get-ai-provider";
import type { ChatMessage } from "@/lib/ai/types";
import { buildUserDataDigest } from "@/lib/context/user-digest";
import { getContextAvailability } from "@/lib/context/availability";
import { checkGroundingWithLaya } from "@/lib/laya/grounding-check";
import { buildAssistantSystemPrompt } from "./prompt";

export type AssistantTurn = { role: "user" | "assistant"; content: string };

/** Server action backing the "Ask AI" panel — keeps provider selection,
 * DB context assembly, and any API keys server-side. Requires an
 * authenticated session so the assistant can never be invoked
 * anonymously, and rebuilds the context digest fresh on every call so it
 * always reflects the user's latest data (e.g. right after a Gmail sync
 * mid-conversation).
 *
 * Before calling the real model, a Laya grounding check decides whether
 * the latest question can actually be answered from real data — see
 * lib/laya/grounding-check.ts. It fails open on any uncertainty, so this
 * only ever skips a call the model would have answered the same honest
 * way anyway. */
export async function askAssistant(history: AssistantTurn[]): Promise<string> {
  const user = await getCurrentUser();
  const latestQuestion = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  const [context, availability] = await Promise.all([
    buildUserDataDigest(user.id),
    getContextAvailability(user.id),
  ]);

  const gate = await checkGroundingWithLaya(latestQuestion, availability);
  if (!gate.sufficient) return gate.message;

  const systemPrompt = buildAssistantSystemPrompt(context);
  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...history];

  const provider = getAIProvider();
  try {
    return await provider.chat(messages);
  } catch (err) {
    console.error("[askAssistant] provider call failed", err);
    return "Sorry, I couldn't reach the AI provider just now. Check Settings/System Status.";
  }
}
