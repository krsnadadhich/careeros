import { describe, expect, it } from "vitest";
import { computeJobFingerprint } from "@/lib/jobs/fingerprint";
import { normalizeForFingerprint } from "@/lib/utils";

describe("normalizeForFingerprint", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeForFingerprint("Senior AI Engineer!")).toBe("senior ai engineer");
  });

  it("treats a trailing space as identical to none", () => {
    expect(normalizeForFingerprint("Senior AI Engineer")).toBe(
      normalizeForFingerprint("Senior AI Engineer ")
    );
  });
});

describe("computeJobFingerprint", () => {
  it("produces the same fingerprint for trivially-formatted duplicates", () => {
    const a = computeJobFingerprint("Senior AI Engineer", "Acme Corp", "Bangalore");
    const b = computeJobFingerprint("Senior AI Engineer ", "Acme Corp,", "Bangalore.");
    expect(a).toBe(b);
  });

  it("treats a null location the same as an empty one", () => {
    const a = computeJobFingerprint("AI Engineer", "Acme", null);
    const b = computeJobFingerprint("AI Engineer", "Acme", "");
    expect(a).toBe(b);
  });

  it("does not collide two genuinely different roles at the same company/location", () => {
    const a = computeJobFingerprint("AI Engineer", "Acme", "Bangalore");
    const b = computeJobFingerprint("Backend Engineer", "Acme", "Bangalore");
    expect(a).not.toBe(b);
  });

  it("does not collide the same role at two different companies", () => {
    const a = computeJobFingerprint("AI Engineer", "Acme", "Bangalore");
    const b = computeJobFingerprint("AI Engineer", "Globex", "Bangalore");
    expect(a).not.toBe(b);
  });
});
