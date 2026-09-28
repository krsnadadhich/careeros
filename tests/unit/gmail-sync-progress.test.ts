import { describe, expect, it } from "vitest";
import { startProgress, updateProgress, incrementProcessed, getProgress, finishProgress } from "@/lib/gmail/sync-progress";

describe("sync-progress", () => {
  it("returns null for a user with no active sync", () => {
    expect(getProgress("no-such-user")).toBeNull();
  });

  it("starts a progress entry in the 'fetching' phase", () => {
    const userId = `user-${Math.random()}`;
    startProgress(userId);

    const progress = getProgress(userId);
    expect(progress?.phase).toBe("fetching");
    expect(progress?.processedMessages).toBe(0);
  });

  it("updateProgress merges fields without clobbering the rest", () => {
    const userId = `user-${Math.random()}`;
    startProgress(userId);
    updateProgress(userId, { phase: "processing", totalMessages: 10 });

    const progress = getProgress(userId);
    expect(progress?.phase).toBe("processing");
    expect(progress?.totalMessages).toBe(10);
    expect(progress?.processedMessages).toBe(0);
  });

  it("incrementProcessed bumps processedMessages by one each call", () => {
    const userId = `user-${Math.random()}`;
    startProgress(userId);
    incrementProcessed(userId);
    incrementProcessed(userId);
    incrementProcessed(userId);

    expect(getProgress(userId)?.processedMessages).toBe(3);
  });

  it("is a no-op when updating/incrementing a user with no active sync", () => {
    const userId = `user-${Math.random()}`;
    expect(() => updateProgress(userId, { phase: "done" })).not.toThrow();
    expect(() => incrementProcessed(userId)).not.toThrow();
    expect(getProgress(userId)).toBeNull();
  });

  it("finishProgress defaults phase to 'done' when not specified", () => {
    const userId = `user-${Math.random()}`;
    startProgress(userId);
    finishProgress(userId, { emailJobsCreated: 2 });

    const progress = getProgress(userId);
    expect(progress?.phase).toBe("done");
    expect(progress?.emailJobsCreated).toBe(2);
  });

  it("finishProgress can set an explicit 'error' phase with a message", () => {
    const userId = `user-${Math.random()}`;
    startProgress(userId);
    finishProgress(userId, { phase: "error", error: "boom" });

    const progress = getProgress(userId);
    expect(progress?.phase).toBe("error");
    expect(progress?.error).toBe("boom");
  });
});
