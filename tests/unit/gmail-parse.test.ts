import { describe, expect, it } from "vitest";
import {
  decodeBase64Url,
  extractPlainText,
  findPartByMimeType,
  htmlToPlainText,
  parseMessage,
  parseSenderHeader,
  type GmailMessagePart,
  type GmailMessageResource,
} from "@/lib/gmail/parse";

function b64url(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("decodeBase64Url", () => {
  it("decodes base64url (with - and _ substitutions) back to the original text", () => {
    const original = "Hello, world! ??/+==";
    expect(decodeBase64Url(b64url(original))).toBe(original);
  });
});

describe("parseSenderHeader", () => {
  it("parses a display-name + email From header", () => {
    expect(parseSenderHeader('"Jane Doe" <jane@example.com>')).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
    });
  });

  it("parses a From header without quotes", () => {
    expect(parseSenderHeader("Jane Doe <jane@example.com>")).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
    });
  });

  it("falls back to the bare email when there's no display name", () => {
    expect(parseSenderHeader("jane@example.com")).toEqual({
      name: "jane@example.com",
      email: "jane@example.com",
    });
  });

  it("handles a missing header", () => {
    expect(parseSenderHeader(undefined)).toEqual({ name: "Unknown sender", email: null });
  });
});

describe("htmlToPlainText", () => {
  it("strips tags, converts breaks, and decodes common entities", () => {
    const html = "<p>Hello &amp; welcome</p><br><div>Line two</div>";
    const text = htmlToPlainText(html);
    expect(text).toContain("Hello & welcome");
    expect(text).toContain("Line two");
    expect(text).not.toContain("<");
  });

  it("strips script and style blocks entirely", () => {
    const html = "<style>.x{color:red}</style><script>alert(1)</script><p>Body text</p>";
    const text = htmlToPlainText(html);
    expect(text).toBe("Body text");
  });
});

describe("findPartByMimeType", () => {
  it("finds a top-level part with no nesting", () => {
    const payload: GmailMessagePart = { mimeType: "text/plain", body: { data: b64url("hi") } };
    expect(findPartByMimeType(payload, "text/plain")?.mimeType).toBe("text/plain");
  });

  it("finds a part nested inside multipart/mixed > multipart/alternative", () => {
    const payload: GmailMessagePart = {
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            { mimeType: "text/plain", body: { data: b64url("plain body") } },
            { mimeType: "text/html", body: { data: b64url("<p>html body</p>") } },
          ],
        },
      ],
    };
    expect(findPartByMimeType(payload, "text/html")?.mimeType).toBe("text/html");
  });

  it("returns null when the mime type isn't present anywhere", () => {
    const payload: GmailMessagePart = { mimeType: "text/plain", body: { data: b64url("hi") } };
    expect(findPartByMimeType(payload, "text/html")).toBeNull();
  });
});

describe("extractPlainText", () => {
  it("prefers text/plain over text/html when both are present", () => {
    const payload: GmailMessagePart = {
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: b64url("plain wins") } },
        { mimeType: "text/html", body: { data: b64url("<p>html loses</p>") } },
      ],
    };
    expect(extractPlainText(payload)).toBe("plain wins");
  });

  it("falls back to converted text/html when there's no text/plain", () => {
    const payload: GmailMessagePart = {
      mimeType: "text/html",
      body: { data: b64url("<p>only html here</p>") },
    };
    expect(extractPlainText(payload)).toBe("only html here");
  });

  it("returns an empty string when neither part exists", () => {
    const payload: GmailMessagePart = { mimeType: "application/octet-stream" };
    expect(extractPlainText(payload)).toBe("");
  });
});

describe("parseMessage", () => {
  it("parses a full Gmail message resource end to end", () => {
    const msg: GmailMessageResource = {
      id: "msg-123",
      threadId: "thread-456",
      snippet: "a short preview",
      internalDate: "1700000000000",
      payload: {
        headers: [
          { name: "From", value: '"Recruiter Bot" <recruiter@company.com>' },
          { name: "Subject", value: "Interview scheduled" },
        ],
        mimeType: "multipart/mixed",
        parts: [
          {
            mimeType: "multipart/alternative",
            parts: [{ mimeType: "text/plain", body: { data: b64url("Please join us tomorrow.") } }],
          },
        ],
      },
    };

    const parsed = parseMessage(msg);
    expect(parsed).toEqual({
      gmailMessageId: "msg-123",
      gmailThreadId: "thread-456",
      sender: "Recruiter Bot",
      senderEmail: "recruiter@company.com",
      subject: "Interview scheduled",
      bodyText: "Please join us tomorrow.",
      snippet: "a short preview",
      receivedAt: new Date(1700000000000),
      primaryLink: null,
    });
  });

  it("wires the primary job link through from the HTML part", () => {
    const msg: GmailMessageResource = {
      id: "msg-link",
      threadId: "thread-link",
      snippet: "New job alert",
      internalDate: "1700000000000",
      payload: {
        headers: [{ name: "Subject", value: "New job alert" }],
        mimeType: "text/html",
        body: {
          data: b64url(
            '<a href="https://example.com/unsubscribe">Unsubscribe</a><a href="https://www.linkedin.com/jobs/view/123">View job</a>'
          ),
        },
      },
    };
    expect(parseMessage(msg).primaryLink).toBe("https://www.linkedin.com/jobs/view/123");
  });

  it("defaults the subject and uses now() when headers/date are missing", () => {
    const msg: GmailMessageResource = {
      id: "msg-2",
      threadId: "thread-2",
      payload: { headers: [], mimeType: "text/plain", body: { data: b64url("body") } },
    };
    const parsed = parseMessage(msg);
    expect(parsed.subject).toBe("(no subject)");
    expect(parsed.sender).toBe("Unknown sender");
    expect(parsed.primaryLink).toBeNull();
  });
});
