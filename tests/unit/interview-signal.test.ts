import { describe, expect, it } from "vitest";
import { isInterviewInviteSignal, inferInterviewType } from "@/lib/interviews/interview-signal";

describe("isInterviewInviteSignal", () => {
  it("is true when company and role are real and the subject carries interview wording", () => {
    expect(
      isInterviewInviteSignal({ company: "Acme", role: "Backend Engineer", subject: "Interview invitation: Backend Engineer" })
    ).toBe(true);
    expect(
      isInterviewInviteSignal({ company: "Acme", role: "AI Engineer", subject: "Let's set up your phone screen" })
    ).toBe(true);
  });

  it("is false when the subject has no interview wording", () => {
    expect(
      isInterviewInviteSignal({ company: "Acme", role: "Backend Engineer", subject: "New job: Backend Engineer at Acme" })
    ).toBe(false);
  });

  it("is false when company or role is missing or a placeholder", () => {
    expect(isInterviewInviteSignal({ company: null, role: "Backend Engineer", subject: "Interview invitation" })).toBe(false);
    expect(isInterviewInviteSignal({ company: "Acme", role: "N/A", subject: "Interview invitation" })).toBe(false);
  });
});

describe("inferInterviewType", () => {
  it("maps known keywords to a label", () => {
    expect(inferInterviewType("Your phone screen with Acme")).toBe("Phone Screen");
    expect(inferInterviewType("Technical interview scheduled")).toBe("Technical");
    expect(inferInterviewType("Onsite interview details")).toBe("Onsite");
    expect(inferInterviewType("Final round interview")).toBe("Final Round");
    expect(inferInterviewType("HR interview invitation")).toBe("HR");
  });

  it("returns null when no keyword matches", () => {
    expect(inferInterviewType("Interview invitation: Backend Engineer")).toBeNull();
  });
});
