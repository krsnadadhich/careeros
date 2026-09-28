import { describe, expect, it } from "vitest";
import { groupByDay } from "@/lib/group-by-day";

describe("groupByDay", () => {
  it("groups items by calendar day, preserving input order within and across groups", () => {
    const items = [
      { id: "a", date: new Date("2026-09-06T10:00:00Z") },
      { id: "b", date: new Date("2026-09-06T22:00:00Z") },
      { id: "c", date: new Date("2026-09-04T09:00:00Z") },
    ];
    const groups = groupByDay(items, (i) => i.date);
    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["c"]);
  });

  it("puts undated items in a trailing 'No date' group", () => {
    const items = [
      { id: "a", date: new Date("2026-09-06T10:00:00Z") },
      { id: "b", date: null },
    ];
    const groups = groupByDay(items, (i) => i.date);
    expect(groups[groups.length - 1].dateLabel).toBe("No date");
    expect(groups[groups.length - 1].items.map((i) => i.id)).toEqual(["b"]);
  });

  it("returns an empty array for no items", () => {
    expect(groupByDay([], () => null)).toEqual([]);
  });
});
