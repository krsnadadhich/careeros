import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ContextAvailability } from "@/lib/context/availability";

const layaPredictMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/laya/client", () => ({ layaPredict: layaPredictMock }));

import { checkGroundingWithLaya } from "@/lib/laya/grounding-check";

function choiceAnswer(choice: string, answer_confidence: number) {
  return { type: "choice" as const, choice, probabilities: {}, confidence: answer_confidence, answer_confidence };
}

const FULL_AVAILABILITY: ContextAvailability = {
  emails: true,
  applications: true,
  interviews: true,
  jobMatches: true,
  recruiters: true,
  tasks: true,
};
const NONE_AVAILABLE: ContextAvailability = {
  emails: false,
  applications: false,
  interviews: false,
  jobMatches: false,
  recruiters: false,
  tasks: false,
};

describe("checkGroundingWithLaya", () => {
  beforeEach(() => {
    layaPredictMock.mockReset();
  });

  it("is sufficient when the mapped topic's data is available", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 5, output_tokens: 0 },
      answers: { topic: choiceAnswer("applications", 0.9) },
    });
    const result = await checkGroundingWithLaya("what's the status of my applications?", FULL_AVAILABILITY);
    expect(result).toEqual({ sufficient: true });
  });

  it("is insufficient with a topic-specific message when the mapped topic's data is missing", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 5, output_tokens: 0 },
      answers: { topic: choiceAnswer("interviews", 0.9) },
    });
    const result = await checkGroundingWithLaya("when's my next interview?", NONE_AVAILABLE);
    expect(result.sufficient).toBe(false);
    if (!result.sufficient) expect(result.message).toContain("interviews");
  });

  it("is always sufficient for the general topic, regardless of availability", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 5, output_tokens: 0 },
      answers: { topic: choiceAnswer("general", 0.95) },
    });
    const result = await checkGroundingWithLaya("any general career advice?", NONE_AVAILABLE);
    expect(result).toEqual({ sufficient: true });
  });

  it("fails open when the sidecar is unreachable", async () => {
    layaPredictMock.mockResolvedValueOnce(null);
    const result = await checkGroundingWithLaya("what's the status of my applications?", NONE_AVAILABLE);
    expect(result).toEqual({ sufficient: true });
  });

  it("fails open when confidence is below the threshold", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 5, output_tokens: 0 },
      answers: { topic: choiceAnswer("applications", 0.2) },
    });
    const result = await checkGroundingWithLaya("what's the status of my applications?", NONE_AVAILABLE);
    expect(result).toEqual({ sufficient: true });
  });

  it("fails open on an unexpected answer shape", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 5, output_tokens: 0 },
      answers: { topic: { type: "noul", noul: 0.5, confidence: 0.9, answer_confidence: 0.9 } },
    });
    const result = await checkGroundingWithLaya("what's the status of my applications?", NONE_AVAILABLE);
    expect(result).toEqual({ sufficient: true });
  });

  it("is always sufficient for an empty question", async () => {
    const result = await checkGroundingWithLaya("   ", NONE_AVAILABLE);
    expect(result).toEqual({ sufficient: true });
    expect(layaPredictMock).not.toHaveBeenCalled();
  });
});
