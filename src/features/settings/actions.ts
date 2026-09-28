"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getAIProvider } from "@/lib/ai/get-ai-provider";
import { pingLaya } from "@/lib/laya/client";

export type PingResult = { reachable: boolean; provider: string };

/** Wraps the existing `AIProvider.ping()` capability (implemented by every
 * provider since Phase 1, never called from anywhere) in a settings-page
 * "Test Connection" action. Every provider's ping() already catches its
 * own errors and returns a plain boolean, so this never throws. */
export async function testAiConnectionAction(): Promise<PingResult> {
  await getCurrentUser();
  const provider = getAIProvider();
  const reachable = await provider.ping();
  return { reachable, provider: provider.name };
}

/** Wraps lib/laya/client.ts#pingLaya() for the same "Test Connection" UI —
 * separate from the AI provider check since Laya is an independent
 * sidecar, not one of the AIProvider implementations (see lib/laya). */
export async function testLayaConnectionAction(): Promise<{ reachable: boolean }> {
  await getCurrentUser();
  const reachable = await pingLaya();
  return { reachable };
}
