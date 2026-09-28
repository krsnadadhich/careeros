import { describe, expect, it, vi, beforeEach } from "vitest";

const emailFindManyMock = vi.hoisted(() => vi.fn());
const emailUpdateMock = vi.hoisted(() => vi.fn());
const jobUpsertMock = vi.hoisted(() => vi.fn());
const applicationFindFirstMock = vi.hoisted(() => vi.fn());
const applicationCreateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    email: { findMany: emailFindManyMock, update: emailUpdateMock },
    job: { upsert: jobUpsertMock },
    application: { findFirst: applicationFindFirstMock, create: applicationCreateMock },
  },
}));

import { autoTrackApplicationsFromEmail } from "@/lib/applications/auto-track";

function email(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "email-1",
    subject: "Thank you for applying to Acme",
    receivedAt: new Date("2026-01-01"),
    extractedData: { company: "Acme", role: "AI Engineer" },
    extractedLink: "https://boards.greenhouse.io/acme/jobs/123",
    ...overrides,
  };
}

describe("autoTrackApplicationsFromEmail", () => {
  beforeEach(() => {
    emailFindManyMock.mockReset();
    emailUpdateMock.mockReset();
    jobUpsertMock.mockReset().mockResolvedValue({ id: "job-1" });
    applicationFindFirstMock.mockReset().mockResolvedValue(null);
    applicationCreateMock.mockReset();
  });

  it("auto-creates an Application and links the email for a confirmation-signal email with no existing application", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({})]);

    const result = await autoTrackApplicationsFromEmail("user-1");

    expect(result).toEqual({ created: 1 });
    expect(applicationCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1", jobId: "job-1", status: "APPLIED" }),
    });
    expect(emailUpdateMock).toHaveBeenCalledWith({ where: { id: "email-1" }, data: { jobId: "job-1" } });
  });

  it("passes the email's extractedLink through as the Job's sourceUrl", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({})]);

    await autoTrackApplicationsFromEmail("user-1");

    expect(jobUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ sourceUrl: "https://boards.greenhouse.io/acme/jobs/123" }),
      })
    );
  });

  it("skips an email that doesn't look like a confirmation", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({ subject: "New job alert: AI Engineer at Acme" })]);

    const result = await autoTrackApplicationsFromEmail("user-1");

    expect(result).toEqual({ created: 0 });
    expect(applicationCreateMock).not.toHaveBeenCalled();
    expect(emailUpdateMock).not.toHaveBeenCalled();
  });

  it("skips an email whose company/role is already tracked, without throwing", async () => {
    applicationFindFirstMock.mockResolvedValueOnce({ id: "existing-app" });
    emailFindManyMock.mockResolvedValueOnce([email({})]);

    const result = await autoTrackApplicationsFromEmail("user-1");

    expect(result).toEqual({ created: 0 });
    expect(applicationCreateMock).not.toHaveBeenCalled();
    expect(emailUpdateMock).not.toHaveBeenCalled();
  });

  it("excludes dismissed emails at the query level", async () => {
    emailFindManyMock.mockResolvedValueOnce([]);
    await autoTrackApplicationsFromEmail("user-1");
    expect(emailFindManyMock.mock.calls[0][0].where.applicationSuggestionDismissed).toBe(false);
  });

  it("skips emails with missing or unusable extractedData", async () => {
    emailFindManyMock.mockResolvedValueOnce([email({ extractedData: null }), email({ id: "email-2", extractedData: "not-an-object" })]);

    const result = await autoTrackApplicationsFromEmail("user-1");

    expect(result).toEqual({ created: 0 });
    expect(applicationCreateMock).not.toHaveBeenCalled();
  });
});
