import { describe, expect, it } from "vitest";
import { normalizeRawJob, detectRemote } from "@/lib/jobs/normalize";
import type { RawJob } from "@/lib/jobs/types";

describe("detectRemote", () => {
  it("detects remote from the location string", () => {
    expect(detectRemote("Remote", "AI Engineer")).toBe(true);
    expect(detectRemote("Bangalore, India (Remote)", "AI Engineer")).toBe(true);
  });

  it("detects remote from the title when location doesn't say so", () => {
    expect(detectRemote(null, "Remote Senior AI Engineer")).toBe(true);
    expect(detectRemote("Bangalore", "Work From Home AI Engineer")).toBe(true);
  });

  it("returns false for an on-site listing", () => {
    expect(detectRemote("Bangalore, India", "AI Engineer")).toBe(false);
    expect(detectRemote(null, "AI Engineer")).toBe(false);
  });
});

describe("normalizeRawJob", () => {
  const raw: RawJob = {
    sourceId: "adzuna-123",
    source: "ADZUNA",
    title: "  Senior AI Engineer  ",
    company: "  Acme Corp  ",
    location: "Bangalore, India",
    salaryMin: 1200000.7,
    salaryMax: 1800000.2,
    currency: null,
    description: "Build LLM-powered products.",
    sourceUrl: "https://example.com/job/123",
    postedAt: "2026-09-01T00:00:00Z",
  };

  it("trims text fields and rounds salary values", () => {
    const job = normalizeRawJob(raw);
    expect(job.role).toBe("Senior AI Engineer");
    expect(job.company).toBe("Acme Corp");
    expect(job.salaryMin).toBe(1200001);
    expect(job.salaryMax).toBe(1800000);
  });

  it("defaults currency to INR when the source doesn't provide one", () => {
    expect(normalizeRawJob(raw).currency).toBe("INR");
  });

  it("computes a fingerprint and a remote flag", () => {
    const job = normalizeRawJob(raw);
    expect(job.remote).toBe(false);
    expect(job.fingerprint).toContain("senior ai engineer");
  });

  it("treats an empty location string as null", () => {
    const job = normalizeRawJob({ ...raw, location: "  " });
    expect(job.location).toBeNull();
  });

  it("leaves postedAt null when the source didn't provide one", () => {
    const job = normalizeRawJob({ ...raw, postedAt: null });
    expect(job.postedAt).toBeNull();
  });
});
