import { describe, expect, it } from "vitest";
import { extractConfirmationFallback } from "@/lib/gmail/confirmation-fallback";

describe("extractConfirmationFallback", () => {
  it("parses the Workable-style 'Thanks for applying to X' template", () => {
    const subject = "Thanks for applying to Pavago";
    const body =
      "Pavago\n\n-------------------------------------------------------------------------------\n\n  Your application for the AI Engineer / AI Automation Specialist job was submitted successfully.\nHere's a copy of your application data for safekeeping.";
    expect(extractConfirmationFallback(subject, body)).toEqual({
      company: "Pavago",
      role: "AI Engineer / AI Automation Specialist",
    });
  });

  it("parses the same template for a different real company", () => {
    const subject = "Thanks for applying to Weekday AI";
    const body =
      "Weekday AI\n\n-------------------------------------------------------------------------------\n\n  Your application for the AI Engineer ( Freelancer/Consultant) job was submitted successfully.";
    expect(extractConfirmationFallback(subject, body)).toEqual({
      company: "Weekday AI",
      role: "AI Engineer ( Freelancer/Consultant)",
    });
  });

  it("parses the LinkedIn 'your application was sent to X' template", () => {
    const subject = "Krishna, your application was sent to Weekday AI (YC W21)";
    const body =
      "Your application was sent to Weekday AI (YC W21)\n\nAI Engineer ( Freelancer/Consultant)\nWeekday AI (YC W21)\nIndia\nView job: https://...";
    expect(extractConfirmationFallback(subject, body)).toEqual({
      company: "Weekday AI",
      role: "AI Engineer ( Freelancer/Consultant)",
    });
  });

  it("returns nulls for a subject that matches neither known template", () => {
    expect(extractConfirmationFallback("Indeed Application: AI Engineer", "Your application has been submitted. Good luck!")).toEqual({
      company: null,
      role: null,
    });
  });
});
