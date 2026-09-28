import { describe, expect, it } from "vitest";
import { isApplicationConfirmationSignal } from "@/lib/applications/application-signal";

describe("isApplicationConfirmationSignal", () => {
  it("is true when company and role are real and the subject carries real confirmation wording", () => {
    expect(
      isApplicationConfirmationSignal({ company: "Acme", role: "Backend Engineer", subject: "Application Received: Backend Engineer" })
    ).toBe(true);
    expect(
      isApplicationConfirmationSignal({ company: "Pythian", role: "AI/ML Engineer", subject: "Thank you for applying to Pythian" })
    ).toBe(true);
  });

  it("is false for a job alert/posting — company and role present but no confirmation wording in the subject", () => {
    expect(
      isApplicationConfirmationSignal({ company: "Acme", role: "Backend Engineer", subject: "New job: Backend Engineer at Acme" })
    ).toBe(false);
  });

  it("is false for a plain saved-search notification even if the model hallucinates a plausible-looking stage elsewhere", () => {
    // Real observed case: "your job alert ... has been created" with the
    // model inventing applicationStage: "Available" — the subject itself
    // carries no real confirmation wording, so this must not qualify.
    expect(
      isApplicationConfirmationSignal({
        company: "Capgemini",
        role: "Python Gen AI Engineer",
        subject: "Krishna: your job alert for Python Developer in Mumbai has been created",
      })
    ).toBe(false);
  });

  it("is false when company or role is missing or a placeholder", () => {
    expect(isApplicationConfirmationSignal({ company: null, role: "Backend Engineer", subject: "Application Received" })).toBe(false);
    expect(isApplicationConfirmationSignal({ company: "Acme", role: "N/A", subject: "Application Received" })).toBe(false);
  });
});
