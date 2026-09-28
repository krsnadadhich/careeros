import { describe, expect, it } from "vitest";
import { decideSuggestion } from "@/lib/applications/status-rules";

function input(overrides: Partial<Parameters<typeof decideSuggestion>[0]> = {}) {
  return {
    currentStatus: "APPLIED" as const,
    pendingSuggestedStatus: null,
    lastIgnoredStatus: null,
    category: "INTERVIEWS" as const,
    ...overrides,
  };
}

describe("decideSuggestion", () => {
  it("suggests INTERVIEW from an earlier stage on an interview email", () => {
    expect(decideSuggestion(input({ currentStatus: "SCREENING", category: "INTERVIEWS" }))).toBe(
      "INTERVIEW"
    );
  });

  it("suggests APPLIED from SAVED on a JOBS (application-received) email", () => {
    expect(decideSuggestion(input({ currentStatus: "SAVED", category: "JOBS" }))).toBe("APPLIED");
  });

  it("suggests TECHNICAL on an assessment email", () => {
    expect(decideSuggestion(input({ currentStatus: "SCREENING", category: "ASSESSMENTS" }))).toBe(
      "TECHNICAL"
    );
  });

  it("suggests OFFER on an offer email", () => {
    expect(decideSuggestion(input({ currentStatus: "HR", category: "OFFERS" }))).toBe("OFFER");
  });

  it("produces no suggestion for a category with no mapping", () => {
    expect(decideSuggestion(input({ category: "OTHER" }))).toBeNull();
  });

  it("does not suggest a status the application already has", () => {
    expect(decideSuggestion(input({ currentStatus: "INTERVIEW", category: "INTERVIEWS" }))).toBeNull();
  });

  it("does not suggest a backward move", () => {
    expect(decideSuggestion(input({ currentStatus: "TECHNICAL", category: "INTERVIEWS" }))).toBeNull();
  });

  it("never suggests anything once WITHDRAWN", () => {
    expect(decideSuggestion(input({ currentStatus: "WITHDRAWN", category: "OFFERS" }))).toBeNull();
    expect(decideSuggestion(input({ currentStatus: "WITHDRAWN", category: "REJECTION" }))).toBeNull();
  });

  it("REJECTION fires from any non-terminal stage, including OFFER", () => {
    expect(decideSuggestion(input({ currentStatus: "OFFER", category: "REJECTION" }))).toBe("REJECTED");
    expect(decideSuggestion(input({ currentStatus: "SAVED", category: "REJECTION" }))).toBe("REJECTED");
  });

  it("does not resurrect an already-REJECTED application", () => {
    expect(decideSuggestion(input({ currentStatus: "REJECTED", category: "INTERVIEWS" }))).toBeNull();
  });

  it("does not re-suggest REJECTED once already REJECTED", () => {
    expect(decideSuggestion(input({ currentStatus: "REJECTED", category: "REJECTION" }))).toBeNull();
  });

  it("does not re-propose a suggestion the user already ignored", () => {
    expect(
      decideSuggestion(
        input({ currentStatus: "SCREENING", category: "INTERVIEWS", lastIgnoredStatus: "INTERVIEW" })
      )
    ).toBeNull();
  });

  it("does not clobber a pending suggestion with an identical one", () => {
    expect(
      decideSuggestion(
        input({ currentStatus: "SCREENING", category: "INTERVIEWS", pendingSuggestedStatus: "INTERVIEW" })
      )
    ).toBeNull();
  });

  it("does not clobber a pending suggestion with an earlier one", () => {
    expect(
      decideSuggestion(
        input({ currentStatus: "SCREENING", category: "RECRUITERS", pendingSuggestedStatus: "TECHNICAL" })
      )
    ).toBeNull();
  });

  it("overrides a pending suggestion with a strictly later one", () => {
    expect(
      decideSuggestion(
        input({ currentStatus: "SCREENING", category: "ASSESSMENTS", pendingSuggestedStatus: "INTERVIEW" })
      )
    ).toBe("TECHNICAL");
  });

  it("never downgrades away from a pending REJECTED suggestion", () => {
    expect(
      decideSuggestion(
        input({ currentStatus: "INTERVIEW", category: "OFFERS", pendingSuggestedStatus: "REJECTED" })
      )
    ).toBeNull();
  });

  it("allows REJECTED to override a pending non-rejection suggestion", () => {
    expect(
      decideSuggestion(
        input({ currentStatus: "INTERVIEW", category: "REJECTION", pendingSuggestedStatus: "TECHNICAL" })
      )
    ).toBe("REJECTED");
  });
});
