import { describe, expect, it } from "vitest";
import { computeFunnelStages } from "@/lib/analytics/funnel";
import { computeResponseRateBySource } from "@/lib/analytics/response-rate";
import { computeAvgDaysToResponse } from "@/lib/analytics/time-to-response";
import { computeMatchScoreByOutcome } from "@/lib/analytics/match-outcome";
import { computeClassificationBreakdown } from "@/lib/analytics/classification-breakdown";

describe("computeFunnelStages", () => {
  it("computes percentage of the first stage for each subsequent stage", () => {
    const stages = computeFunnelStages([
      { label: "Applied", count: 10 },
      { label: "Interviewed", count: 4 },
      { label: "Offer", count: 1 },
    ]);
    expect(stages).toEqual([
      { label: "Applied", count: 10, pct: 100 },
      { label: "Interviewed", count: 4, pct: 40 },
      { label: "Offer", count: 1, pct: 10 },
    ]);
  });

  it("returns 0% for every stage without dividing by zero when there's no data", () => {
    const stages = computeFunnelStages([
      { label: "Applied", count: 0 },
      { label: "Interviewed", count: 0 },
    ]);
    expect(stages.every((s) => s.pct === 0)).toBe(true);
  });
});

describe("computeResponseRateBySource", () => {
  it("groups by source and computes response rate, sorted by volume", () => {
    const result = computeResponseRateBySource(
      [
        { jobId: "j1", source: "LINKEDIN" },
        { jobId: "j2", source: "LINKEDIN" },
        { jobId: "j3", source: "INDEED" },
      ],
      new Set(["j1"])
    );
    expect(result).toEqual([
      { source: "LINKEDIN", total: 2, responded: 1, responseRate: 50 },
      { source: "INDEED", total: 1, responded: 0, responseRate: 0 },
    ]);
  });

  it("returns an empty array for no applications", () => {
    expect(computeResponseRateBySource([], new Set())).toEqual([]);
  });
});

describe("computeAvgDaysToResponse", () => {
  it("averages only entries with a response, ignoring null ones", () => {
    const avg = computeAvgDaysToResponse([
      { appliedAt: new Date("2026-01-01"), firstResponseAt: new Date("2026-01-03") }, // 2 days
      { appliedAt: new Date("2026-01-01"), firstResponseAt: new Date("2026-01-05") }, // 4 days
      { appliedAt: new Date("2026-01-01"), firstResponseAt: null },
    ]);
    expect(avg).toBe(3);
  });

  it("returns null (not 0) when nobody has responded yet", () => {
    expect(computeAvgDaysToResponse([{ appliedAt: new Date(), firstResponseAt: null }])).toBeNull();
    expect(computeAvgDaysToResponse([])).toBeNull();
  });
});

describe("computeMatchScoreByOutcome", () => {
  it("buckets by interview outcome and averages each independently", () => {
    const result = computeMatchScoreByOutcome([
      { overallScore: 90, reachedInterview: true },
      { overallScore: 80, reachedInterview: true },
      { overallScore: 40, reachedInterview: false },
    ]);
    expect(result).toEqual({ interviewedAvg: 85, notInterviewedAvg: 40, interviewedCount: 2, notInterviewedCount: 1 });
  });

  it("returns null averages (not 0) for an empty bucket", () => {
    const result = computeMatchScoreByOutcome([{ overallScore: 70, reachedInterview: true }]);
    expect(result.notInterviewedAvg).toBeNull();
    expect(result.notInterviewedCount).toBe(0);
  });
});

describe("computeClassificationBreakdown", () => {
  it("splits laya vs ollama counts and computes percentages", () => {
    const result = computeClassificationBreakdown([
      { classificationSource: "laya", classificationConfidence: 0.9 },
      { classificationSource: "laya", classificationConfidence: 0.7 },
      { classificationSource: "ollama", classificationConfidence: null },
    ]);
    expect(result.layaCount).toBe(2);
    expect(result.ollamaCount).toBe(1);
    expect(result.totalClassified).toBe(3);
    expect(result.layaPct).toBe(67);
    expect(result.ollamaPct).toBe(33);
    expect(result.avgLayaConfidence).toBe(0.8);
  });

  it("returns zeroed percentages and a null average with no classified emails", () => {
    const result = computeClassificationBreakdown([]);
    expect(result).toEqual({
      totalClassified: 0,
      layaCount: 0,
      ollamaCount: 0,
      layaPct: 0,
      ollamaPct: 0,
      avgLayaConfidence: null,
    });
  });

  it("ignores rows with a null classificationSource", () => {
    const result = computeClassificationBreakdown([
      { classificationSource: null, classificationConfidence: null },
      { classificationSource: "laya", classificationConfidence: 0.9 },
    ]);
    expect(result.totalClassified).toBe(1);
    expect(result.layaCount).toBe(1);
  });
});
