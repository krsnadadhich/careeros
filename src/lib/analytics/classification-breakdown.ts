export interface ClassificationInput {
  classificationSource: string | null;
  classificationConfidence: number | null;
}

export interface ClassificationBreakdown {
  totalClassified: number;
  layaCount: number;
  ollamaCount: number;
  layaPct: number;
  ollamaPct: number;
  avgLayaConfidence: number | null;
}

/** Aggregates which engine actually classified each synced email — the
 * hybrid Laya-first/Ollama-fallback split this app is built around,
 * surfaced as real numbers rather than left implicit. Rows synced before
 * classificationSource existed have it as null and are excluded by the
 * caller's query, not counted here as either engine. */
export function computeClassificationBreakdown(inputs: ClassificationInput[]): ClassificationBreakdown {
  const layaConfidences: number[] = [];
  let layaCount = 0;
  let ollamaCount = 0;

  for (const input of inputs) {
    if (input.classificationSource === "laya") {
      layaCount++;
      if (input.classificationConfidence !== null) layaConfidences.push(input.classificationConfidence);
    } else if (input.classificationSource === "ollama") {
      ollamaCount++;
    }
  }

  const totalClassified = layaCount + ollamaCount;
  const avgLayaConfidence =
    layaConfidences.length === 0
      ? null
      : Math.round((layaConfidences.reduce((sum, c) => sum + c, 0) / layaConfidences.length) * 100) / 100;

  return {
    totalClassified,
    layaCount,
    ollamaCount,
    layaPct: totalClassified === 0 ? 0 : Math.round((layaCount / totalClassified) * 100),
    ollamaPct: totalClassified === 0 ? 0 : Math.round((ollamaCount / totalClassified) * 100),
    avgLayaConfidence,
  };
}
