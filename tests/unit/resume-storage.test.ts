import { describe, expect, it } from "vitest";
import { isPdfBuffer, sanitizeDisplayName } from "@/lib/resume/storage";

describe("isPdfBuffer", () => {
  it("accepts a buffer starting with the PDF magic bytes", () => {
    const buf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("rest of file")]);
    expect(isPdfBuffer(buf)).toBe(true);
  });

  it("rejects a buffer without the PDF header even if named .pdf elsewhere", () => {
    const buf = Buffer.from("this is not a pdf, just text pretending to be one");
    expect(isPdfBuffer(buf)).toBe(false);
  });

  it("rejects an empty buffer", () => {
    expect(isPdfBuffer(Buffer.alloc(0))).toBe(false);
  });
});

describe("sanitizeDisplayName", () => {
  it("replaces path separators", () => {
    expect(sanitizeDisplayName("../../etc/passwd")).not.toContain("/");
    expect(sanitizeDisplayName("..\\..\\windows\\system32")).not.toContain("\\");
  });

  it("strips control characters", () => {
    const withControlChars = "resume\x00.pdf\x1f";
    expect(sanitizeDisplayName(withControlChars)).toBe("resume.pdf");
  });

  it("falls back to a default name for an empty result", () => {
    expect(sanitizeDisplayName("")).toBe("resume.pdf");
  });

  it("caps length at 200 characters", () => {
    const long = "a".repeat(500) + ".pdf";
    expect(sanitizeDisplayName(long).length).toBeLessThanOrEqual(200);
  });

  it("leaves a normal filename untouched", () => {
    expect(sanitizeDisplayName("Krishna_Resume_2026.pdf")).toBe("Krishna_Resume_2026.pdf");
  });
});
