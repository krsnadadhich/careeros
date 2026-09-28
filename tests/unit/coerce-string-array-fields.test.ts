import { describe, expect, it } from "vitest";
import { coerceStringArrayFields } from "@/lib/ai/ollama-provider";

describe("coerceStringArrayFields", () => {
  it("splits a bare string field on common list delimiters", () => {
    const result = coerceStringArrayFields(
      { skills: "Python, LLMs; RAG\nLangChain" },
      ["skills"]
    );
    expect(result).toEqual({ skills: ["Python", "LLMs", "RAG", "LangChain"] });
  });

  it("leaves an already-correct array field untouched", () => {
    const result = coerceStringArrayFields({ skills: ["Python", "RAG"] }, ["skills"]);
    expect(result).toEqual({ skills: ["Python", "RAG"] });
  });

  it("leaves a missing field untouched", () => {
    const result = coerceStringArrayFields({ other: 1 }, ["skills"]);
    expect(result).toEqual({ other: 1 });
  });

  it("only touches the named fields, not the rest of the object", () => {
    const result = coerceStringArrayFields(
      { skills: "Python", experienceLevel: "senior" },
      ["skills"]
    );
    expect(result).toEqual({ skills: ["Python"], experienceLevel: "senior" });
  });

  it("returns non-object input unchanged", () => {
    expect(coerceStringArrayFields(null, ["skills"])).toBeNull();
    expect(coerceStringArrayFields("not an object", ["skills"])).toBe("not an object");
  });

  it("drops empty segments produced by trailing delimiters", () => {
    const result = coerceStringArrayFields({ skills: "Python,,LLMs," }, ["skills"]);
    expect(result).toEqual({ skills: ["Python", "LLMs"] });
  });
});
