import type { LayaPredictResponse, LayaQuestion } from "./types";

function baseUrl(): string {
  return process.env.LAYA_BASE_URL ?? "http://localhost:8000";
}

/** Calls the laya sidecar's `/v1/systemone`. Returns `null` on any network
 * error, timeout, or non-2xx response so callers have a clean signal to
 * fall back to Ollama — mirrors `OllamaProvider`'s own error handling. */
export async function layaPredict(
  state: unknown,
  questions: Record<string, LayaQuestion>
): Promise<LayaPredictResponse | null> {
  try {
    const res = await fetch(`${baseUrl()}/v1/systemone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, questions }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as LayaPredictResponse;
  } catch (err) {
    console.warn("[laya-client] predict failed", err);
    return null;
  }
}

/** Cheap connectivity check — used by Settings/System Status, same
 * contract as `AIProvider.ping()`. */
export async function pingLaya(): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl()}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
