import { describe, expect, it, vi, beforeEach } from "vitest";

const emailFindFirstMock = vi.hoisted(() => vi.fn());
const emailUpdateMock = vi.hoisted(() => vi.fn());
const emailUpdateManyMock = vi.hoisted(() => vi.fn());
const applicationFindFirstMock = vi.hoisted(() => vi.fn());
const interviewCreateMock = vi.hoisted(() => vi.fn());
const getCurrentUserMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    email: { findFirst: emailFindFirstMock, update: emailUpdateMock, updateMany: emailUpdateManyMock },
    application: { findFirst: applicationFindFirstMock },
    interview: { create: interviewCreateMock },
  },
}));

import { confirmInterviewSuggestionAction, dismissInterviewSuggestionAction } from "@/features/interviews/actions";

describe("confirmInterviewSuggestionAction", () => {
  beforeEach(() => {
    emailFindFirstMock.mockReset();
    emailUpdateMock.mockReset();
    applicationFindFirstMock.mockReset();
    interviewCreateMock.mockReset();
    getCurrentUserMock.mockReset().mockResolvedValue({ id: "user-1" });
  });

  it("creates an Interview with the parsed date and inferred type, and marks the email handled", async () => {
    emailFindFirstMock.mockResolvedValueOnce({
      id: "email-1",
      subject: "Your phone screen with Acme",
      extractedData: { interviewDate: "2026-02-01T10:00:00.000Z" },
    });
    applicationFindFirstMock.mockResolvedValueOnce({ id: "app-1" });
    interviewCreateMock.mockResolvedValueOnce({ id: "interview-1" });

    const result = await confirmInterviewSuggestionAction("email-1", "app-1");

    expect(result).toEqual({ status: "success", interviewId: "interview-1" });
    expect(interviewCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        applicationId: "app-1",
        scheduledAt: new Date("2026-02-01T10:00:00.000Z"),
        type: "Phone Screen",
        sourceEmailId: "email-1",
      },
    });
    expect(emailUpdateMock).toHaveBeenCalledWith({
      where: { id: "email-1" },
      data: { interviewSuggestionDismissed: true },
    });
  });

  it("errors when the email isn't owned by the user", async () => {
    emailFindFirstMock.mockResolvedValueOnce(null);
    const result = await confirmInterviewSuggestionAction("email-1", "app-1");
    expect(result).toEqual({ status: "error", message: "Email not found." });
    expect(interviewCreateMock).not.toHaveBeenCalled();
  });

  it("errors when the application isn't owned by the user", async () => {
    emailFindFirstMock.mockResolvedValueOnce({ id: "email-1", subject: "Interview invitation", extractedData: null });
    applicationFindFirstMock.mockResolvedValueOnce(null);
    const result = await confirmInterviewSuggestionAction("email-1", "app-1");
    expect(result).toEqual({ status: "error", message: "Application not found." });
    expect(interviewCreateMock).not.toHaveBeenCalled();
  });

  it("never invents a date when extractedData has no parseable interviewDate", async () => {
    emailFindFirstMock.mockResolvedValueOnce({ id: "email-1", subject: "Interview invitation", extractedData: { interviewDate: "TBD" } });
    applicationFindFirstMock.mockResolvedValueOnce({ id: "app-1" });
    interviewCreateMock.mockResolvedValueOnce({ id: "interview-1" });

    await confirmInterviewSuggestionAction("email-1", "app-1");

    expect(interviewCreateMock.mock.calls[0][0].data.scheduledAt).toBeNull();
  });
});

describe("dismissInterviewSuggestionAction", () => {
  beforeEach(() => {
    emailUpdateManyMock.mockReset();
    getCurrentUserMock.mockReset().mockResolvedValue({ id: "user-1" });
  });

  it("flips the dismissal flag without creating anything", async () => {
    emailUpdateManyMock.mockResolvedValueOnce({ count: 1 });
    const result = await dismissInterviewSuggestionAction("email-1");
    expect(result).toEqual({ status: "success" });
    expect(emailUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "email-1", userId: "user-1" },
      data: { interviewSuggestionDismissed: true },
    });
  });

  it("errors when the email isn't owned by the user", async () => {
    emailUpdateManyMock.mockResolvedValueOnce({ count: 0 });
    const result = await dismissInterviewSuggestionAction("email-1");
    expect(result).toEqual({ status: "error", message: "Email not found." });
  });
});
