import { describe, expect, it } from "vitest";
import { parseCommaList } from "@/lib/utils";

describe("parseCommaList", () => {
  it("trims whitespace around each item", () => {
    expect(parseCommaList(" Python ,  LLMs  , RAG")).toEqual(["Python", "LLMs", "RAG"]);
  });

  it("drops empty entries from trailing/double commas", () => {
    expect(parseCommaList("Python,,LLMs,")).toEqual(["Python", "LLMs"]);
  });

  it("dedupes case-insensitively, preserving first-seen casing", () => {
    expect(parseCommaList("Python, python, PYTHON, RAG")).toEqual(["Python", "RAG"]);
  });

  it("returns an empty array for an empty or whitespace-only string", () => {
    expect(parseCommaList("")).toEqual([]);
    expect(parseCommaList("   ")).toEqual([]);
  });

  it("caps the result at 30 items", () => {
    const many = Array.from({ length: 50 }, (_, i) => `skill${i}`).join(",");
    expect(parseCommaList(many)).toHaveLength(30);
  });
});
