import { describe, expect, it, vi, beforeEach } from "vitest";

const emailFindFirstMock = vi.hoisted(() => vi.fn());
const emailFindManyMock = vi.hoisted(() => vi.fn());
const applicationFindManyMock = vi.hoisted(() => vi.fn());
const jobFindManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    email: { findFirst: emailFindFirstMock, findMany: emailFindManyMock },
    application: { findMany: applicationFindManyMock },
    job: { findMany: jobFindManyMock },
  },
}));

describe("findApplicationForEmail", () => {
  beforeEach(() => {
    emailFindFirstMock.mockReset();
    emailFindManyMock.mockReset();
    applicationFindManyMock.mockReset();
    jobFindManyMock.mockReset();
  });

  it("resolves via thread continuity when an earlier email in the thread is already linked", async () => {
    emailFindFirstMock.mockResolvedValueOnce({ jobId: "job-1" });
    applicationFindManyMock.mockResolvedValueOnce([
      { id: "app-1", jobId: "job-1", status: "APPLIED" },
    ]);

    const { findApplicationForEmail } = await import("@/lib/applications/linking");
    const result = await findApplicationForEmail({
      userId: "user-1",
      gmailThreadId: "thread-1",
      senderEmail: null,
      extractedCompany: null,
    });

    expect(result).toEqual({ id: "app-1", jobId: "job-1", status: "APPLIED" });
    expect(emailFindManyMock).not.toHaveBeenCalled();
  });

  it("resolves via a unique company-name match when there's no thread signal", async () => {
    applicationFindManyMock.mockResolvedValueOnce([
      { id: "app-1", jobId: "job-1", status: "APPLIED", job: { company: "Acme Corp" } },
      { id: "app-2", jobId: "job-2", status: "SAVED", job: { company: "Globex" } },
    ]);

    const { findApplicationForEmail } = await import("@/lib/applications/linking");
    const result = await findApplicationForEmail({
      userId: "user-1",
      gmailThreadId: null,
      senderEmail: null,
      extractedCompany: "Acme Corp.",
    });

    expect(result).toEqual({ id: "app-1", jobId: "job-1", status: "APPLIED" });
  });

  it("stays unlinked when the company name matches more than one application", async () => {
    applicationFindManyMock.mockResolvedValueOnce([
      { id: "app-1", jobId: "job-1", status: "APPLIED", job: { company: "Acme Corp" } },
      { id: "app-2", jobId: "job-2", status: "SCREENING", job: { company: "acme corp" } },
    ]);

    const { findApplicationForEmail } = await import("@/lib/applications/linking");
    const result = await findApplicationForEmail({
      userId: "user-1",
      gmailThreadId: null,
      senderEmail: null,
      extractedCompany: "Acme Corp",
    });

    expect(result).toBeNull();
  });

  it("resolves via sender domain when it maps to exactly one company", async () => {
    emailFindManyMock.mockResolvedValueOnce([{ jobId: "job-1" }, { jobId: "job-1" }]);
    jobFindManyMock.mockResolvedValueOnce([{ id: "job-1", company: "Acme Corp" }]);
    applicationFindManyMock.mockResolvedValueOnce([
      { id: "app-1", jobId: "job-1", status: "SCREENING" },
    ]);

    const { findApplicationForEmail } = await import("@/lib/applications/linking");
    const result = await findApplicationForEmail({
      userId: "user-1",
      gmailThreadId: null,
      senderEmail: "recruiter@acme.com",
      extractedCompany: null,
    });

    expect(result).toEqual({ id: "app-1", jobId: "job-1", status: "SCREENING" });
  });

  it("does not trust a sender domain shared across more than one company", async () => {
    emailFindManyMock.mockResolvedValueOnce([{ jobId: "job-1" }, { jobId: "job-2" }]);
    jobFindManyMock.mockResolvedValueOnce([
      { id: "job-1", company: "Acme Corp" },
      { id: "job-2", company: "Globex" },
    ]);

    const { findApplicationForEmail } = await import("@/lib/applications/linking");
    const result = await findApplicationForEmail({
      userId: "user-1",
      gmailThreadId: null,
      senderEmail: "no-reply@greenhouse.io",
      extractedCompany: null,
    });

    expect(result).toBeNull();
  });

  it("returns null when no signal matches anything", async () => {
    applicationFindManyMock.mockResolvedValueOnce([]);

    const { findApplicationForEmail } = await import("@/lib/applications/linking");
    const result = await findApplicationForEmail({
      userId: "user-1",
      gmailThreadId: null,
      senderEmail: null,
      extractedCompany: "Nobody Inc",
    });

    expect(result).toBeNull();
  });
});
