import { describe, expect, it, vi, beforeEach } from "vitest";

const emailFindManyMock = vi.hoisted(() => vi.fn());
const applicationFindManyMock = vi.hoisted(() => vi.fn());
const interviewFindManyMock = vi.hoisted(() => vi.fn());
const recruiterFindManyMock = vi.hoisted(() => vi.fn());
const upsertMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    email: { findMany: emailFindManyMock },
    application: { findMany: applicationFindManyMock },
    interview: { findMany: interviewFindManyMock },
    recruiter: { findMany: recruiterFindManyMock },
    dailyBrief: { upsert: upsertMock },
  },
}));

import { generateDailyBriefForUser } from "@/features/brief/generate";

function reset() {
  emailFindManyMock.mockReset().mockResolvedValue([]);
  applicationFindManyMock.mockReset().mockResolvedValue([]);
  interviewFindManyMock.mockReset().mockResolvedValue([]);
  recruiterFindManyMock.mockReset().mockResolvedValue([]);
  upsertMock.mockReset().mockImplementation(async ({ create }) => create);
}

describe("generateDailyBriefForUser", () => {
  beforeEach(reset);

  it("returns empty arrays and still upserts when there's nothing to report", async () => {
    const result = await generateDailyBriefForUser("user-1");
    expect(result).toEqual({ status: "success", brief: { lines: [], recommendations: [] } });
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it("summarizes urgent/action-required emails into one line", async () => {
    emailFindManyMock.mockResolvedValueOnce([
      { sender: "Acme <hr@acme.com>", extractedData: { company: "Acme" } },
      { sender: "beta@corp.com", extractedData: null },
    ]);

    const result = await generateDailyBriefForUser("user-1");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.brief.lines[0]).toBe("2 emails need your attention: Acme, beta@corp.com");
    }
  });

  it("adds a line for each upcoming interview", async () => {
    interviewFindManyMock.mockResolvedValueOnce([
      { type: "Phone Screen", scheduledAt: new Date("2026-01-05T15:00:00Z"), application: { job: { company: "Acme" } } },
    ]);

    const result = await generateDailyBriefForUser("user-1");
    if (result.status === "success") {
      expect(result.brief.lines[0]).toContain("Interview with Acme — Phone Screen on");
    }
  });

  it("adds a line for each pending application suggestion", async () => {
    applicationFindManyMock.mockResolvedValueOnce([
      { suggestedStatus: "INTERVIEW", job: { company: "Acme", role: "AI Engineer" } },
    ]);

    const result = await generateDailyBriefForUser("user-1");
    if (result.status === "success") {
      expect(result.brief.lines[0]).toBe("Application to Acme — suggested move to INTERVIEW (review to confirm)");
    }
  });

  it("recommends following up with a stale recruiter", async () => {
    const staleDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    recruiterFindManyMock.mockResolvedValueOnce([
      { name: "Taylor Reed", company: "Acme", lastContactedAt: staleDate, createdAt: staleDate, emails: [] },
    ]);

    const result = await generateDailyBriefForUser("user-1");
    if (result.status === "success") {
      expect(result.brief.recommendations[0]).toBe("Follow up with Taylor Reed (Acme) — no contact in 10 days");
    }
  });

  it("never recommends following up with a recently-contacted recruiter whose latest email doesn't need a reply", async () => {
    recruiterFindManyMock.mockResolvedValueOnce([
      { name: "Taylor Reed", company: "Acme", lastContactedAt: new Date(), createdAt: new Date(), emails: [{ actionRequired: false }] },
    ]);
    const result = await generateDailyBriefForUser("user-1");
    if (result.status === "success") {
      expect(result.brief.recommendations).toEqual([]);
    }
  });

  it("recommends following up with a recently-contacted recruiter whose latest email still needs a reply", async () => {
    const recentDate = new Date();
    recruiterFindManyMock.mockResolvedValueOnce([
      { name: "Taylor Reed", company: "Acme", lastContactedAt: recentDate, createdAt: recentDate, emails: [{ actionRequired: true }] },
    ]);
    const result = await generateDailyBriefForUser("user-1");
    if (result.status === "success") {
      expect(result.brief.recommendations[0]).toBe("Follow up with Taylor Reed (Acme) — no contact in 0 days");
    }
  });

  it("recommends replying to a real, non-placeholder assessment deadline verbatim", async () => {
    emailFindManyMock.mockResolvedValueOnce([
      { sender: "hr@beta.com", extractedData: { company: "Beta Corp", assessmentDeadline: "48 hours from receipt" } },
    ]);

    const result = await generateDailyBriefForUser("user-1");
    if (result.status === "success") {
      expect(result.brief.recommendations).toContain("Reply to Beta Corp — assessment deadline: 48 hours from receipt");
    }
  });

  it("never invents a deadline recommendation from a placeholder value", async () => {
    emailFindManyMock.mockResolvedValueOnce([
      { sender: "hr@beta.com", extractedData: { company: "Beta Corp", assessmentDeadline: "N/A" } },
    ]);
    const result = await generateDailyBriefForUser("user-1");
    if (result.status === "success") {
      expect(result.brief.recommendations).toEqual([]);
    }
  });

  it("returns an honest error result (never throws) when a query fails", async () => {
    emailFindManyMock.mockRejectedValueOnce(new Error("db down"));
    const result = await generateDailyBriefForUser("user-1");
    expect(result.status).toBe("error");
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
