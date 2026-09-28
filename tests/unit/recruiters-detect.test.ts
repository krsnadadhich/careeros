import { describe, expect, it } from "vitest";
import { extractRecruiterIdentity } from "@/lib/recruiters/detect";

function baseSignal(overrides: Partial<Parameters<typeof extractRecruiterIdentity>[0]> = {}) {
  return {
    senderName: "ATS Noreply",
    senderEmail: "noreply@ats.example",
    category: "OTHER" as const,
    extractedRecruiterName: null,
    extractedRecruiterEmail: null,
    extractedCompany: null,
    ...overrides,
  };
}

describe("extractRecruiterIdentity", () => {
  it("prefers LLM-extracted recruiter fields when present and the category makes a recruiter mention plausible", () => {
    const identity = extractRecruiterIdentity(
      baseSignal({
        category: "INTERVIEWS",
        extractedRecruiterName: "Jamie Lee",
        extractedRecruiterEmail: "jamie@acme.example",
        extractedCompany: "Acme",
      })
    );
    expect(identity).toEqual({ name: "Jamie Lee", email: "jamie@acme.example", company: "Acme" });
  });

  it("falls back to sender identity only when the email is categorized RECRUITERS", () => {
    const identity = extractRecruiterIdentity(
      baseSignal({ category: "RECRUITERS", senderName: "Jordan Smith", senderEmail: "jordan@agency.example" })
    );
    expect(identity).toEqual({ name: "Jordan Smith", email: "jordan@agency.example", company: null });
  });

  it("returns null for a generic OTHER-category email with no extracted recruiter info", () => {
    expect(extractRecruiterIdentity(baseSignal())).toBeNull();
  });

  it("returns null for a JOBS-category email even with a sender name, since it wasn't extracted or flagged as a recruiter", () => {
    expect(extractRecruiterIdentity(baseSignal({ category: "JOBS" }))).toBeNull();
  });

  it("ignores placeholder extraction values instead of persisting them as a real identity", () => {
    for (const placeholder of ["N/A", "None", "null", "No specified", "No recruiter name", "  "]) {
      const identity = extractRecruiterIdentity(
        baseSignal({
          category: "RECRUITERS",
          extractedRecruiterName: placeholder,
          senderName: "",
          senderEmail: null,
        })
      );
      // Falls through to the RECRUITERS-category sender fallback, which has
      // nothing usable either (no sender name or email here) -> null.
      expect(identity).toBeNull();
    }
  });

  it("does not trust an extracted recruiter name on a REJECTION-category email (hallucination-prone: a small model can invent a name unrelated to the actual content)", () => {
    const identity = extractRecruiterIdentity(
      baseSignal({ category: "REJECTION", extractedRecruiterName: "Anup", senderName: "LinkedIn" })
    );
    expect(identity).toBeNull();
  });

  it("rejects an extracted email that isn't actually email-shaped", () => {
    const identity = extractRecruiterIdentity(
      baseSignal({ category: "OFFERS", extractedRecruiterEmail: "N/A", senderEmail: "hr@company.example" })
    );
    expect(identity).toBeNull();
  });

  it("treats a placeholder company as unknown (null) rather than storing the literal string", () => {
    const identity = extractRecruiterIdentity(
      baseSignal({ category: "RECRUITERS", extractedRecruiterName: "Jordan Smith", extractedCompany: "N/A" })
    );
    expect(identity?.company).toBeNull();
  });
});
