import { describe, expect, it } from "vitest";
import { computeLocationScore } from "@/lib/matching/location";

describe("computeLocationScore", () => {
  it("scores a remote job 100 regardless of target locations", () => {
    const result = computeLocationScore({
      job: { location: "Anywhere", remote: true },
      targetLocations: ["Bangalore"],
    });
    expect(result).toEqual({ locationScore: 100, label: "remote-friendly" });
  });

  it("scores 70 with no stated location preference", () => {
    const result = computeLocationScore({
      job: { location: "Bangalore", remote: false },
      targetLocations: [],
    });
    expect(result).toEqual({ locationScore: 70, label: "no location preference set" });
  });

  it("scores 100 when the job location overlaps a target, case-insensitively", () => {
    const result = computeLocationScore({
      job: { location: "Bangalore, Karnataka", remote: false },
      targetLocations: ["bangalore"],
    });
    expect(result).toEqual({ locationScore: 100, label: "matches your target locations" });
  });

  it("scores 40 on an explicit mismatch", () => {
    const result = computeLocationScore({
      job: { location: "Mumbai", remote: false },
      targetLocations: ["Bangalore", "Delhi"],
    });
    expect(result).toEqual({ locationScore: 40, label: "outside your target locations" });
  });

  it("treats a null job location with stated preferences as a mismatch", () => {
    const result = computeLocationScore({
      job: { location: null, remote: false },
      targetLocations: ["Bangalore"],
    });
    expect(result.locationScore).toBe(40);
  });
});
