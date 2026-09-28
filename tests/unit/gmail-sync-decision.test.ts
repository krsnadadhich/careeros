import { describe, expect, it, vi, beforeEach } from "vitest";
import { GmailApiError } from "@/lib/gmail/client";

const gmailFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/gmail/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gmail/client")>();
  return { ...actual, gmailFetch: gmailFetchMock };
});

function jsonResponse(body: unknown) {
  return { json: async () => body } as Response;
}

describe("gmail sync — incremental vs backfill decision", () => {
  beforeEach(() => {
    gmailFetchMock.mockReset();
  });

  it("backfill() lists messages then reads the profile for a starting historyId", async () => {
    const { backfill } = await import("@/lib/gmail/sync");

    gmailFetchMock
      .mockResolvedValueOnce(jsonResponse({ messages: [{ id: "m1" }, { id: "m2" }] }))
      .mockResolvedValueOnce(jsonResponse({ historyId: "1000" }));

    const result = await backfill("user-1");

    expect(result.messageIds).toEqual(["m1", "m2"]);
    expect(result.latestHistoryId).toBe("1000");
    expect(gmailFetchMock).toHaveBeenCalledTimes(2);
    expect(gmailFetchMock.mock.calls[0][1]).toContain("/messages?");
    expect(gmailFetchMock.mock.calls[1][1]).toBe("/profile");
  });

  it("incremental() returns new message ids and the latest historyId on success", async () => {
    const { incremental } = await import("@/lib/gmail/sync");

    gmailFetchMock.mockResolvedValueOnce(
      jsonResponse({
        history: [{ messagesAdded: [{ message: { id: "m9" } }] }],
        historyId: "2000",
      })
    );

    const result = await incremental("user-1", "1000");

    expect(result).not.toBe("stale");
    if (result !== "stale") {
      expect(result.messageIds).toEqual(["m9"]);
      expect(result.latestHistoryId).toBe("2000");
    }
  });

  it("incremental() reports 'stale' when Gmail returns 404 for an expired startHistoryId", async () => {
    const { incremental } = await import("@/lib/gmail/sync");

    gmailFetchMock.mockRejectedValueOnce(new GmailApiError("Not found", 404));

    const result = await incremental("user-1", "very-old-history-id");

    expect(result).toBe("stale");
  });

  it("incremental() re-throws non-404 errors instead of treating them as stale", async () => {
    const { incremental } = await import("@/lib/gmail/sync");

    gmailFetchMock.mockRejectedValueOnce(new GmailApiError("Server error", 500));

    await expect(incremental("user-1", "1000")).rejects.toThrow("Server error");
  });
});
