/** Below this, a Laya answer is treated as not trustworthy enough to use —
 * the caller falls back to Ollama instead. Laya's `answer_confidence` is a
 * genuinely calibrated probability (see types.ts), so this is a real
 * "how often is this actually right" threshold, not an arbitrary score. */
export const LAYA_CONFIDENCE_THRESHOLD = 0.6;

export function meetsConfidence(confidences: number[], threshold = LAYA_CONFIDENCE_THRESHOLD): boolean {
  return confidences.length > 0 && confidences.every((c) => c >= threshold);
}
