import { describe, expect, it } from "vitest";
import { isJobPostingLeadSignal } from "@/lib/jobs/email-lead-signal";

const REAL_LINK = "https://www.linkedin.com/comm/jobs/view/123456/";

describe("isJobPostingLeadSignal", () => {
  it("is true for a job alert — real company and role, no confirmation wording, and a matched job link", () => {
    expect(
      isJobPostingLeadSignal({
        company: "Vantage Labs",
        role: "Senior Engineer",
        subject: "New job: Senior Engineer at Vantage Labs",
        extractedLink: REAL_LINK,
      })
    ).toBe(true);
  });

  it("is true for a plain saved-search notification with a real company/role, no application yet, and a matched link", () => {
    expect(
      isJobPostingLeadSignal({
        company: "Capgemini",
        role: "Python Gen AI Engineer",
        subject: "Krishna: your job alert for Python Developer in Mumbai has been created",
        extractedLink: REAL_LINK,
      })
    ).toBe(true);
  });

  it("is false for a genuine application confirmation — it belongs in the auto-tracked applications flow instead", () => {
    expect(
      isJobPostingLeadSignal({
        company: "Acme",
        role: "Backend Engineer",
        subject: "Application Received: Backend Engineer",
        extractedLink: REAL_LINK,
      })
    ).toBe(false);
  });

  it("is false when company or role is missing", () => {
    expect(
      isJobPostingLeadSignal({ company: null, role: "Backend Engineer", subject: "New job posting", extractedLink: REAL_LINK })
    ).toBe(false);
    expect(
      isJobPostingLeadSignal({ company: "Acme", role: "N/A", subject: "New job posting", extractedLink: REAL_LINK })
    ).toBe(false);
  });

  it("is false when no real job-posting link was found, even with real company/role and a genuine job-alert subject", () => {
    // The actual behavior change this fix makes: company/role + a
    // non-confirmation subject is no longer enough on its own — real
    // recruiter outreach, newsletters, and promo mail can all produce a
    // plausible company/role pair without ever being a real posting.
    expect(
      isJobPostingLeadSignal({
        company: "Vantage Labs",
        role: "Senior Engineer",
        subject: "New job: Senior Engineer at Vantage Labs",
        extractedLink: null,
      })
    ).toBe(false);
  });

  it("partitions cleanly against isApplicationConfirmationSignal — never both true for the same input", async () => {
    const { isApplicationConfirmationSignal } = await import("@/lib/applications/application-signal");
    const cases = [
      { company: "Acme", role: "Engineer", subject: "Application Received", extractedLink: REAL_LINK },
      { company: "Acme", role: "Engineer", subject: "New job posting", extractedLink: REAL_LINK },
      { company: null, role: "Engineer", subject: "Application Received", extractedLink: REAL_LINK },
      { company: "Acme", role: null, subject: "New job posting", extractedLink: REAL_LINK },
      { company: "Acme", role: "Engineer", subject: "New job posting", extractedLink: null },
    ];
    for (const c of cases) {
      const isConfirmation = isApplicationConfirmationSignal(c);
      const isLead = isJobPostingLeadSignal(c);
      expect(isConfirmation && isLead).toBe(false);
    }
  });
});
