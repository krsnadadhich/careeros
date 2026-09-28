import { describe, expect, it } from "vitest";
import {
  freshnessSignal,
  salaryTransparencySignal,
  skillsMatchSignal,
  experienceMatchSignal,
  locationMatchSignal,
  extractSalaryString,
} from "@/lib/jobs/quality-signals";

const NOW = new Date("2026-09-28T00:00:00.000Z");
function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

describe("freshnessSignal", () => {
  it("is positive under 3 days old", () => {
    expect(freshnessSignal({ postedAt: daysAgo(2), createdAt: daysAgo(2) }, NOW).tone).toBe("positive");
  });
  it("is neutral at the 3-day boundary", () => {
    expect(freshnessSignal({ postedAt: daysAgo(3), createdAt: daysAgo(3) }, NOW).tone).toBe("neutral");
  });
  it("is neutral just under 14 days old", () => {
    expect(freshnessSignal({ postedAt: daysAgo(13), createdAt: daysAgo(13) }, NOW).tone).toBe("neutral");
  });
  it("is muted at the 14-day boundary and beyond", () => {
    expect(freshnessSignal({ postedAt: daysAgo(14), createdAt: daysAgo(14) }, NOW).tone).toBe("muted");
  });
  it("falls back to createdAt when postedAt is null", () => {
    const result = freshnessSignal({ postedAt: null, createdAt: daysAgo(1) }, NOW);
    expect(result.tone).toBe("positive");
  });
});

describe("salaryTransparencySignal", () => {
  it("is positive with real numeric salary", () => {
    const result = salaryTransparencySignal({ salaryMin: 10, salaryMax: 20, currency: "INR" }, null);
    expect(result).toEqual({ label: "INR 10–20", tone: "positive" });
  });
  it("is neutral with only a raw extracted salary string, shown verbatim", () => {
    const result = salaryTransparencySignal({ salaryMin: null, salaryMax: null, currency: null }, "₹18-24 LPA");
    expect(result).toEqual({ label: "₹18-24 LPA", tone: "neutral" });
  });
  it("returns null (no fabricated signal) when neither is available", () => {
    expect(salaryTransparencySignal({ salaryMin: null, salaryMax: null, currency: null }, null)).toBeNull();
  });
  it("returns null for a placeholder extracted salary string", () => {
    expect(salaryTransparencySignal({ salaryMin: null, salaryMax: null, currency: null }, "N/A")).toBeNull();
  });
});

describe("skillsMatchSignal / experienceMatchSignal tone boundaries", () => {
  it("39 is muted, 40 is neutral", () => {
    expect(skillsMatchSignal(39).tone).toBe("muted");
    expect(skillsMatchSignal(40).tone).toBe("neutral");
  });
  it("69 is neutral, 70 is positive", () => {
    expect(experienceMatchSignal(69).tone).toBe("neutral");
    expect(experienceMatchSignal(70).tone).toBe("positive");
  });
});

describe("locationMatchSignal", () => {
  it("maps all 4 known labels to the right tone", () => {
    expect(locationMatchSignal("remote-friendly").tone).toBe("positive");
    expect(locationMatchSignal("matches your target locations").tone).toBe("positive");
    expect(locationMatchSignal("no location preference set").tone).toBe("neutral");
    expect(locationMatchSignal("outside your target locations").tone).toBe("muted");
  });
  it("falls back to neutral for an unrecognized label", () => {
    expect(locationMatchSignal("some future label").tone).toBe("neutral");
  });
});

describe("extractSalaryString", () => {
  it("reads a string salary field out of extractedData", () => {
    expect(extractSalaryString({ salary: "$100k" })).toBe("$100k");
  });
  it("returns null for missing, non-string, or malformed extractedData", () => {
    expect(extractSalaryString(null)).toBeNull();
    expect(extractSalaryString({})).toBeNull();
    expect(extractSalaryString({ salary: 100 })).toBeNull();
    expect(extractSalaryString("not-an-object")).toBeNull();
    expect(extractSalaryString([])).toBeNull();
  });
});
