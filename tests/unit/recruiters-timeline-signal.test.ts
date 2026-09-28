import { describe, expect, it } from "vitest";
import { classifyTimelineStage } from "@/lib/recruiters/timeline-signal";

describe("classifyTimelineStage", () => {
  it("subject keywords win over category", () => {
    expect(classifyTimelineStage({ category: "RECRUITERS", subject: "Interview scheduled with Acme" })).toBe(
      "Interview"
    );
    expect(classifyTimelineStage({ category: "OTHER", subject: "Thank you for applying to Acme" })).toBe("Applied");
  });

  it("falls back to category when no keyword matches", () => {
    expect(classifyTimelineStage({ category: "OFFERS", subject: "Great news from Acme" })).toBe("Offer");
    expect(classifyTimelineStage({ category: "ASSESSMENTS", subject: "Next steps" })).toBe("Assessment");
    expect(classifyTimelineStage({ category: "RECRUITERS", subject: "Quick question" })).toBe("Recruiter Contact");
  });

  it("falls back to Other when neither keyword nor category maps", () => {
    expect(classifyTimelineStage({ category: "REJECTION", subject: "Update on your application" })).toBe("Other");
    expect(classifyTimelineStage({ category: "OTHER", subject: "Newsletter digest" })).toBe("Other");
  });

  it("matches keywords case-insensitively", () => {
    expect(classifyTimelineStage({ category: "OTHER", subject: "INTERVIEW CONFIRMATION" })).toBe("Interview");
  });
});
