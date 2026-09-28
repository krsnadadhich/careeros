import { describe, expect, it } from "vitest";
import { isPlaceholderText } from "@/lib/utils";

describe("isPlaceholderText", () => {
  it("treats null, undefined, and empty/whitespace strings as placeholders", () => {
    expect(isPlaceholderText(null)).toBe(true);
    expect(isPlaceholderText(undefined)).toBe(true);
    expect(isPlaceholderText("")).toBe(true);
    expect(isPlaceholderText("   ")).toBe(true);
  });

  it("treats common 'no answer' phrasings as placeholders, case-insensitively", () => {
    for (const value of ["N/A", "n/a", "None", "null", "Unknown", "Not Specified", "not available"]) {
      expect(isPlaceholderText(value)).toBe(true);
    }
  });

  it("treats real content as non-placeholder", () => {
    expect(isPlaceholderText("Acme Corp")).toBe(false);
    expect(isPlaceholderText("Senior Engineer")).toBe(false);
  });
});
