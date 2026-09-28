import type { AIProvider, EmailClassification } from "@/lib/ai/types";
import { classifyEmailWithLaya } from "@/lib/laya/classify-email";
import { meetsConfidence } from "@/lib/laya/confidence";

export interface ResolvedClassification {
  category: EmailClassification["category"];
  priority: EmailClassification["priority"];
  actionRequired: boolean;
  importanceScore: number;
  /** null when Laya handled it — filled in lazily on first open, see
   * lib/gmail/lazy-summary.ts. Non-null only on the Ollama fallback path,
   * which already generated a real summary as part of its one call. */
  aiSummary: string | null;
  /** Which engine actually produced this classification — used both to
   * decide whether it's trustworthy enough to skip extraction on (see
   * sync.ts) and to persist for the AI transparency dashboard. */
  source: "laya" | "ollama";
  /** The min of laya's per-question confidences — the same value
   * meetsConfidence() already gates on. null on the ollama path, which has
   * no comparable calibrated score. */
  confidence: number | null;
}

/** The single decision point for "who classifies this email" — Laya first,
 * Ollama only when Laya is unreachable or unsure. Pulled out of sync.ts so
 * it's directly unit-testable without mocking Gmail fetches. */
export async function resolveEmailClassification(
  input: { subject: string; sender: string; body: string },
  ai: AIProvider
): Promise<ResolvedClassification> {
  const laya = await classifyEmailWithLaya(input);
  if (laya && meetsConfidence(laya.confidences)) {
    return { ...laya.result, aiSummary: null, source: "laya", confidence: Math.min(...laya.confidences) };
  }

  const fallback = await ai.classifyEmail(input);
  return {
    category: fallback.category,
    priority: fallback.priority,
    actionRequired: fallback.actionRequired,
    importanceScore: fallback.importanceScore,
    aiSummary: fallback.summary,
    source: "ollama",
    confidence: null,
  };
}
