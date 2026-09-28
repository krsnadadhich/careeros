import { describe, expect, it, vi, beforeEach } from "vitest";

const layaPredictMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/laya/client", () => ({ layaPredict: layaPredictMock }));

import { classifyEmailWithLaya } from "@/lib/laya/classify-email";

function choiceAnswer(choice: string, answer_confidence: number) {
  return { type: "choice" as const, choice, probabilities: {}, confidence: answer_confidence, answer_confidence };
}
function scoreAnswer(score: number, answer_confidence: number) {
  return { type: "score" as const, score, legend: {}, probabilities: {}, confidence: answer_confidence, answer_confidence };
}
function noulAnswer(noul: number, answer_confidence: number) {
  return { type: "noul" as const, noul, confidence: answer_confidence, answer_confidence };
}

const INPUT = { subject: "Interview scheduled", sender: "jordan@acme.com", body: "Are you free Thursday?" };

describe("classifyEmailWithLaya", () => {
  beforeEach(() => {
    layaPredictMock.mockReset();
  });

  it("maps a high-confidence response into category/priority/importanceScore/actionRequired", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 10, output_tokens: 0 },
      answers: {
        category: choiceAnswer("INTERVIEWS", 0.91),
        urgency: scoreAnswer(1.5, 0.8),
        needs_reply: noulAnswer(0.7, 0.85),
      },
    });

    const result = await classifyEmailWithLaya(INPUT);

    expect(result).not.toBeNull();
    expect(result!.result.category).toBe("INTERVIEWS");
    expect(result!.result.priority).toBe("HIGH"); // 1.5/2 = 0.75 ratio
    expect(result!.result.importanceScore).toBe(75);
    expect(result!.result.actionRequired).toBe(true);
    expect(result!.confidences).toEqual([0.91, 0.8, 0.85]);
  });

  it("returns null when the sidecar is unreachable", async () => {
    layaPredictMock.mockResolvedValueOnce(null);
    expect(await classifyEmailWithLaya(INPUT)).toBeNull();
  });

  it("returns null when laya returns a category outside the known enum", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 10, output_tokens: 0 },
      answers: {
        category: choiceAnswer("NOT_A_REAL_CATEGORY", 0.9),
        urgency: scoreAnswer(0, 0.9),
        needs_reply: noulAnswer(0, 0.9),
      },
    });
    expect(await classifyEmailWithLaya(INPUT)).toBeNull();
  });

  it("returns null when the answer shapes don't match the expected question types", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 10, output_tokens: 0 },
      answers: { category: noulAnswer(0.5, 0.9) }, // wrong type, and missing urgency/needs_reply
    });
    expect(await classifyEmailWithLaya(INPUT)).toBeNull();
  });

  it("never emits CRITICAL — urgency tops out at HIGH", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 10, output_tokens: 0 },
      answers: {
        category: choiceAnswer("OFFERS", 0.95),
        urgency: scoreAnswer(2, 0.95), // max possible urgency
        needs_reply: noulAnswer(0.9, 0.95),
      },
    });
    const result = await classifyEmailWithLaya(INPUT);
    expect(result!.result.priority).toBe("HIGH");
    expect(result!.result.importanceScore).toBe(100);
  });
});
