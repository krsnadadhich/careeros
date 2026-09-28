import { prisma } from "@/lib/db/prisma";

export class GmailNotConnectedError extends Error {
  constructor(message = "Gmail is not connected for this account.") {
    super(message);
  }
}

export class GmailAuthError extends Error {
  constructor(message = "Gmail access was revoked — reconnect in Settings.") {
    super(message);
  }
}

export class GmailRateLimitError extends Error {
  constructor(message = "Gmail rate limit reached.") {
    super(message);
  }
}

export class GmailApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

async function getGoogleAccount(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account) throw new GmailNotConnectedError();
  return account;
}

export async function isGmailConnected(userId: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  return Boolean(account?.refresh_token && account.scope?.includes(GMAIL_SCOPE));
}

/** Returns a valid access token, refreshing it first if it has expired
 * (or is about to). Persists the refreshed token back onto the Account row,
 * preserving the existing refresh_token since Google doesn't reissue one
 * on a routine refresh. */
export async function getValidAccessToken(userId: string): Promise<string> {
  const account = await getGoogleAccount(userId);

  const isExpired =
    !account.expires_at ||
    account.expires_at <= Math.floor(Date.now() / 1000) + TOKEN_REFRESH_BUFFER_SECONDS;

  if (!isExpired && account.access_token) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new GmailAuthError("No refresh token on file — reconnect Gmail in Settings.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 400 && body.includes("invalid_grant")) {
      throw new GmailAuthError();
    }
    throw new GmailAuthError(`Token refresh failed (${res.status}).`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    },
  });

  return data.access_token;
}

/** Authenticated fetch against the Gmail API, rooted at /users/me. Retries
 * once on 401 after a forced token refresh; maps 429 and other non-2xx
 * responses to typed errors. Never logs response bodies (may contain email
 * content). */
export async function gmailFetch(
  userId: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me${path}`;
  const accessToken = await getValidAccessToken(userId);

  let res = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    // Access token invalid despite not being locally expired — force a
    // refresh and retry exactly once.
    await prisma.account.updateMany({
      where: { userId, provider: "google" },
      data: { expires_at: 0 },
    });
    const refreshed = await getValidAccessToken(userId);
    res = await fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${refreshed}` },
    });
  }

  if (res.status === 429) {
    throw new GmailRateLimitError();
  }
  if (!res.ok) {
    throw new GmailApiError(`Gmail API request failed: ${res.status} ${res.statusText}`, res.status);
  }

  return res;
}
