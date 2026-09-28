import { describe, expect, it, vi, beforeEach } from "vitest";

const emailFindManyMock = vi.hoisted(() => vi.fn());
const jobFindFirstMock = vi.hoisted(() => vi.fn());
const jobCreateMock = vi.hoisted(() => vi.fn());
const emailUpdateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    email: { findMany: emailFindManyMock, update: emailUpdateMock },
    job: { findFirst: jobFindFirstMock, create: jobCreateMock },
  },
}));

import { createJobsFromEmailLeads } from "@/lib/jobs/from-email";

function email(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "email-1",
    senderEmail: "jobalerts-noreply@linkedin.com",
    subject: "New job: AI Engineer at Acme",
    aiSummary: null,
    extractedData: { company: "Acme", role: "AI Engineer" },
    extractedLink: "https://www.linkedin.com/jobs/view/123",
    bodyText: "A new AI Engineer role at Acme is now open. Apply today to join the team building real products.",
    ...overrides,
  };
}

describe("createJobsFromEmailLeads", () => {
  beforeEach(() => {
    emailFindManyMock.mockReset();
    jobFindFirstMock.mockReset().mockResolvedValue(null);
    jobCreateMock.mockReset().mockResolvedValue({ id: "job-1" });
    emailUpdateMock.mockReset();
  });

  it("sets sourceUrl from the email's extractedLink", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({})]);

    await createJobsFromEmailLeads("user-1");

    expect(jobCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ sourceUrl: "https://www.linkedin.com/jobs/view/123" }),
    });
  });

  it("never creates a Job when the email has no matched job-posting link, even with real company/role", async () => {
    // The actual behavior change from the accuracy fix: a matched link is
    // now required, not just a plausible company/role pair — otherwise
    // recruiter outreach/newsletters/promo mail with a guessable company
    // name would still get promoted into a fake listing.
    emailFindManyMock.mockResolvedValueOnce([email({ extractedLink: null })]);

    const result = await createJobsFromEmailLeads("user-1");

    expect(jobCreateMock).not.toHaveBeenCalled();
    expect(result).toEqual({ created: 0, linked: 0 });
  });

  it("prefers a real aiSummary for the description when one exists", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({ aiSummary: "A real AI-written one-line summary." })]);

    await createJobsFromEmailLeads("user-1");

    const description = jobCreateMock.mock.calls[0][0].data.description as string;
    expect(description).toContain("A real AI-written one-line summary.");
    expect(description).not.toContain("Apply today to join the team");
  });

  it("falls back to truncated real body content when aiSummary is null (the common case since Phase A)", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({ aiSummary: null })]);

    await createJobsFromEmailLeads("user-1");

    const description = jobCreateMock.mock.calls[0][0].data.description as string;
    expect(description).toContain("A new AI Engineer role at Acme is now open");
  });

  it("still produces a subject-only description when both aiSummary and bodyText are missing", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({ aiSummary: null, bodyText: null })]);

    await createJobsFromEmailLeads("user-1");

    const description = jobCreateMock.mock.calls[0][0].data.description as string;
    expect(description).toBe("New job: AI Engineer at Acme");
  });
});
