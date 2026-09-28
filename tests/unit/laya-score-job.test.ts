import { describe, expect, it, vi, beforeEach } from "vitest";

const layaPredictMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/laya/client", () => ({ layaPredict: layaPredictMock }));

import { scoreJobWithLaya } from "@/lib/laya/score-job";

function scoreAnswer(score: number, answer_confidence: number) {
  return { type: "score" as const, score, legend: {}, probabilities: {}, confidence: answer_confidence, answer_confidence };
}

const INPUT = { resumeText: "Python, RAG, 5 years experience.", jobDescription: "AI Engineer at Acme, needs Python and RAG." };

describe("scoreJobWithLaya", () => {
  beforeEach(() => {
    layaPredictMock.mockReset();
  });

  it("normalizes both scores to 0-100 and templates the rationale from the chosen levels", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 10, output_tokens: 0 },
      answers: {
        experience_fit: scoreAnswer(2, 0.8), // index 2 of 4 levels -> "a good match..."
        role_fit: scoreAnswer(2, 0.85), // index 2 of 3 levels (max) -> "a strong fit..."
      },
    });

    const result = await scoreJobWithLaya(INPUT);

    expect(result).not.toBeNull();
    expect(result!.result.experienceScore).toBe(Math.round((2 / 3) * 100));
    expect(result!.result.roleScore).toBe(100); // 2/(3-1) = 1.0
    expect(result!.result.rationale).toBe(
      "Experience: a good match for what this job needs. Role fit: a strong fit for this role."
    );
    expect(result!.confidences).toEqual([0.8, 0.85]);
  });

  it("clamps a boundary score of 0 to the lowest level", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 10, output_tokens: 0 },
      answers: {
        experience_fit: scoreAnswer(0, 0.9),
        role_fit: scoreAnswer(0, 0.9),
      },
    });
    const result = await scoreJobWithLaya(INPUT);
    expect(result!.result.experienceScore).toBe(0);
    expect(result!.result.roleScore).toBe(0);
    expect(result!.result.rationale).toContain("far below what this job needs");
    expect(result!.result.rationale).toContain("a poor fit for this role");
  });

  it("returns null when the sidecar is unreachable", async () => {
    layaPredictMock.mockResolvedValueOnce(null);
    expect(await scoreJobWithLaya(INPUT)).toBeNull();
  });

  it("returns null when the answer shapes don't match the expected question types", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 10, output_tokens: 0 },
      answers: { experience_fit: { type: "noul", noul: 0.5, confidence: 0.9, answer_confidence: 0.9 } },
    });
    expect(await scoreJobWithLaya(INPUT)).toBeNull();
  });

  it("truncates resume and job text to the laya field cap", async () => {
    layaPredictMock.mockResolvedValueOnce({
      model: "laya-rl-agent",
      usage: { input_tokens: 10, output_tokens: 0 },
      answers: { experience_fit: scoreAnswer(1, 0.9), role_fit: scoreAnswer(1, 0.9) },
    });

    await scoreJobWithLaya({ resumeText: "x".repeat(5000), jobDescription: "y".repeat(5000) });

    const [state] = layaPredictMock.mock.calls[0];
    expect((state as { resume: string }).resume.length).toBeLessThanOrEqual(600);
    expect((state as { job: string }).job.length).toBeLessThanOrEqual(600);
  });
});
