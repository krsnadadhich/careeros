// Pure MIME/parsing helpers — no I/O, no fetch. Kept separate from client.ts
// and sync.ts so they're directly unit-testable against hand-built fixtures.

import { extractLinks, pickPrimaryJobLink } from "./extract-link";

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailMessagePart[];
}

export interface GmailMessageResource {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload: GmailMessagePart;
}

export interface ParsedEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  sender: string;
  senderEmail: string | null;
  subject: string;
  bodyText: string;
  snippet: string;
  receivedAt: Date;
  /** The real "View Job"/"Apply" link, pulled from the raw HTML part
   * before `extractPlainText` discards all markup — null when the
   * message has no HTML part, or nothing plausible was found in it. */
  primaryLink: string | null;
}

/** Gmail's body.data is base64url (RFC 4648 §5), not standard base64. */
export function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function getHeader(
  headers: { name: string; value: string }[] | undefined,
  name: string
): string | undefined {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

/** Depth-first search over the (possibly nested) MIME parts tree. */
export function findPartByMimeType(
  payload: GmailMessagePart,
  mimeType: string
): GmailMessagePart | null {
  if (payload.mimeType === mimeType && payload.body?.data) return payload;
  for (const part of payload.parts ?? []) {
    const found = findPartByMimeType(part, mimeType);
    if (found) return found;
  }
  return null;
}

/** Strips tags/decodes a handful of common entities. Output is plain text
 * only — CareerOS never renders raw HTML from an email, so this doesn't
 * need to be (and isn't) a full sanitizer. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractPlainText(payload: GmailMessagePart): string {
  const plain = findPartByMimeType(payload, "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);

  const html = findPartByMimeType(payload, "text/html");
  if (html?.body?.data) return htmlToPlainText(decodeBase64Url(html.body.data));

  return "";
}

/** The one piece of the raw HTML worth keeping — see extract-link.ts.
 * Runs on the same text/html part `extractPlainText` converts, before
 * that conversion throws the markup away. `text/plain`-only messages
 * (no HTML part at all) honestly have no link to find. */
export function extractPrimaryLink(payload: GmailMessagePart): string | null {
  const html = findPartByMimeType(payload, "text/html");
  if (!html?.body?.data) return null;
  return pickPrimaryJobLink(extractLinks(decodeBase64Url(html.body.data)));
}

/** Parses an RFC 5322 "From" header like `"Jane Doe" <jane@x.com>` or a
 * bare `jane@x.com`. */
export function parseSenderHeader(from: string | undefined): {
  name: string;
  email: string | null;
} {
  if (!from) return { name: "Unknown sender", email: null };
  const match = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    return { name: name || match[2], email: match[2] };
  }
  const emailOnly = from.trim();
  return { name: emailOnly, email: emailOnly.includes("@") ? emailOnly : null };
}

export function parseMessage(msg: GmailMessageResource): ParsedEmail {
  const { name, email } = parseSenderHeader(getHeader(msg.payload.headers, "From"));
  const subject = getHeader(msg.payload.headers, "Subject") ?? "(no subject)";
  const receivedAt = msg.internalDate
    ? new Date(Number(msg.internalDate))
    : new Date();

  return {
    gmailMessageId: msg.id,
    gmailThreadId: msg.threadId,
    sender: name,
    senderEmail: email,
    subject,
    bodyText: extractPlainText(msg.payload),
    snippet: msg.snippet ?? "",
    receivedAt,
    primaryLink: extractPrimaryLink(msg.payload),
  };
}
