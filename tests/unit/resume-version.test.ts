import { describe, expect, it, vi, beforeEach } from "vitest";

const aggregateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: { resume: { aggregate: aggregateMock } },
}));

describe("nextResumeVersion", () => {
  beforeEach(() => {
    aggregateMock.mockReset();
  });

  it("returns 1 when the user has no resumes yet", async () => {
    aggregateMock.mockResolvedValue({ _max: { version: null } });
    const { nextResumeVersion } = await import("@/features/resume/queries");
    expect(await nextResumeVersion("user-1")).toBe(1);
  });

  it("returns max + 1 when prior resumes exist", async () => {
    aggregateMock.mockResolvedValue({ _max: { version: 4 } });
    const { nextResumeVersion } = await import("@/features/resume/queries");
    expect(await nextResumeVersion("user-1")).toBe(5);
  });
});
