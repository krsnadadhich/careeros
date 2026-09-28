import { describe, expect, it, vi, beforeEach } from "vitest";

const emailFindManyMock = vi.hoisted(() => vi.fn());
const applicationFindManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    email: { findMany: emailFindManyMock },
    application: { findMany: applicationFindManyMock },
  },
}));

import { getInterviewSuggestions } from "@/features/interviews/queries";

function email(overrides: Partial<{ id: string; subject: string; jobId: string; extractedData: unknown }>) {
  return {
    id: "email-1",
    subject: "Interview invitation: AI Engineer",
    receivedAt: new Date("2026-01-01"),
    jobId: "job-1",
    extractedData: { company: "Acme", role: "AI Engineer" },
    ...overrides,
  };
}

function application(overrides: Partial<{ id: string; jobId: string }>) {
  return {
    id: "app-1",
    jobId: "job-1",
    job: { role: "AI Engineer", company: "Acme" },
    ...overrides,
  };
}

describe("getInterviewSuggestions", () => {
  beforeEach(() => {
    emailFindManyMock.mockReset();
    applicationFindManyMock.mockReset();
  });

  it("returns a suggestion for a signal-passing email with exactly one tracked application", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({})]);
    applicationFindManyMock.mockResolvedValueOnce([application({})]);

    const result = await getInterviewSuggestions("user-1");

    expect(result).toEqual([
      {
        emailId: "email-1",
        applicationId: "app-1",
        company: "Acme",
        role: "AI Engineer",
        subject: "Interview invitation: AI Engineer",
        receivedAt: new Date("2026-01-01"),
      },
    ]);
  });

  it("skips a job with zero tracked applications", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({})]);
    applicationFindManyMock.mockResolvedValueOnce([]);

    const result = await getInterviewSuggestions("user-1");
    expect(result).toEqual([]);
  });

  it("skips a job with more than one tracked application (ambiguous)", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({})]);
    applicationFindManyMock.mockResolvedValueOnce([
      application({ id: "app-1" }),
      application({ id: "app-2" }),
    ]);

    const result = await getInterviewSuggestions("user-1");
    expect(result).toEqual([]);
  });

  it("skips an email whose subject doesn't look like an interview invite", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({ subject: "New job alert: AI Engineer" })]);
    applicationFindManyMock.mockResolvedValueOnce([application({})]);

    const result = await getInterviewSuggestions("user-1");
    expect(result).toEqual([]);
  });

  it("never queries applications when there are no candidate emails", async () => {
    emailFindManyMock.mockResolvedValueOnce([]);

    const result = await getInterviewSuggestions("user-1");
    expect(result).toEqual([]);
    expect(applicationFindManyMock).not.toHaveBeenCalled();
  });

  it("excludes dismissed emails at the query level", async () => {
    emailFindManyMock.mockResolvedValueOnce([]);
    await getInterviewSuggestions("user-1");
    expect(emailFindManyMock.mock.calls[0][0].where.interviewSuggestionDismissed).toBe(false);
  });
});
