import { describe, expect, it, vi, beforeEach } from "vitest";

const buildUserDataDigestMock = vi.hoisted(() => vi.fn());
const getContextAvailabilityMock = vi.hoisted(() => vi.fn());
const checkGroundingWithLayaMock = vi.hoisted(() => vi.fn());
const chatMock = vi.hoisted(() => vi.fn());
const getCurrentUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/context/user-digest", () => ({ buildUserDataDigest: buildUserDataDigestMock }));
vi.mock("@/lib/context/availability", () => ({ getContextAvailability: getContextAvailabilityMock }));
vi.mock("@/lib/laya/grounding-check", () => ({ checkGroundingWithLaya: checkGroundingWithLayaMock }));
vi.mock("@/lib/ai/get-ai-provider", () => ({ getAIProvider: () => ({ chat: chatMock }) }));

import { askAssistant } from "@/features/assistant/actions";

describe("askAssistant", () => {
  beforeEach(() => {
    buildUserDataDigestMock.mockReset().mockResolvedValue("## Recent Emails\nNo emails synced yet.");
    getContextAvailabilityMock.mockReset().mockResolvedValue({
      emails: false,
      applications: false,
      interviews: false,
      jobMatches: false,
      recruiters: false,
      tasks: false,
    });
    checkGroundingWithLayaMock.mockReset();
    chatMock.mockReset();
    getCurrentUserMock.mockReset().mockResolvedValue({ id: "user-1" });
  });

  it("returns the gate's message and never calls the AI provider when ungrounded", async () => {
    checkGroundingWithLayaMock.mockResolvedValueOnce({ sufficient: false, message: "I don't have that yet." });

    const result = await askAssistant([{ role: "user", content: "when's my next interview?" }]);

    expect(result).toBe("I don't have that yet.");
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("calls the provider with the system prompt plus history when grounded", async () => {
    checkGroundingWithLayaMock.mockResolvedValueOnce({ sufficient: true });
    chatMock.mockResolvedValueOnce("Here's your answer.");

    const history = [{ role: "user" as const, content: "what should I do today?" }];
    const result = await askAssistant(history);

    expect(result).toBe("Here's your answer.");
    expect(chatMock).toHaveBeenCalledTimes(1);
    const messages = chatMock.mock.calls[0][0];
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("No emails synced yet.");
    expect(messages[1]).toEqual(history[0]);
  });

  it("passes the latest user turn (not the whole history) to the grounding check", async () => {
    checkGroundingWithLayaMock.mockResolvedValueOnce({ sufficient: true });
    chatMock.mockResolvedValueOnce("ok");

    await askAssistant([
      { role: "user", content: "first question" },
      { role: "assistant", content: "first answer" },
      { role: "user", content: "second question" },
    ]);

    expect(checkGroundingWithLayaMock).toHaveBeenCalledWith("second question", expect.anything());
  });

  it("returns the existing honest error string when the provider throws", async () => {
    checkGroundingWithLayaMock.mockResolvedValueOnce({ sufficient: true });
    chatMock.mockRejectedValueOnce(new Error("provider down"));

    const result = await askAssistant([{ role: "user", content: "anything" }]);

    expect(result).toContain("couldn't reach the AI provider");
  });
});
