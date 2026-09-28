import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "@/lib/concurrency";

describe("mapWithConcurrency", () => {
  it("processes every item exactly once and preserves input order in the result", async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await mapWithConcurrency(items, 2, async (n) => n * 10);
    expect(result).toEqual([10, 20, 30, 40, 50]);
  });

  it("never runs more than `limit` calls concurrently", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await mapWithConcurrency(items, 3, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return n;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it("propagates a rejection when one item's call throws", async () => {
    const items = [1, 2, 3];

    await expect(
      mapWithConcurrency(items, 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      })
    ).rejects.toThrow("boom");
  });

  it("handles an empty items array", async () => {
    const result = await mapWithConcurrency([], 4, async (n: number) => n);
    expect(result).toEqual([]);
  });

  it("handles limit greater than the number of items", async () => {
    const result = await mapWithConcurrency([1, 2], 10, async (n) => n + 1);
    expect(result).toEqual([2, 3]);
  });
});
