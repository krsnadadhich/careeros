import { prisma } from "@/lib/db/prisma";
import { getAIProvider } from "@/lib/ai/get-ai-provider";
import {
  gmailFetch,
  isGmailConnected,
  GmailApiError,
  GmailAuthError,
  GmailNotConnectedError,
  GmailRateLimitError,
} from "./client";
import { parseMessage, type GmailMessageResource } from "./parse";
import { linkEmailAndSuggestStatus, autoTrackApplicationsFromEmail } from "@/lib/applications";
import { linkEmailToRecruiter } from "@/lib/recruiters";
import { extractConfirmationFallback } from "./confirmation-fallback";
import { resolveEmailClassification } from "./classify-with-fallback";
import { looksJobRelatedByKeyword } from "./job-keyword-signal";
import { isPlaceholderText } from "@/lib/utils";
import { mapWithConcurrency } from "@/lib/concurrency";
import { createJobsFromEmailLeads } from "@/lib/jobs/from-email";
import { matchJobsForUser } from "@/lib/matching";
import { startProgress, updateProgress, incrementProcessed, finishProgress } from "./sync-progress";

// Gmail's per-user QPS limits and a single local Ollama instance (which can
// only run one generation at a time on typical hardware) both cap how much
// real parallelism is available — the actual win from concurrency is
// overlapping one message's Gmail fetch (network I/O) with another's Ollama
// call (compute), not raw fan-out. 4 is a conservative starting point.
const SYNC_CONCURRENCY = 4;

export interface SyncResult {
  status: "success" | "error";
  emailsProcessed: number;
  emailJobsCreated?: number;
  matchesComputed?: number;
  applicationsTracked?: number;
  errors: number;
  message?: string;
}

const BACKFILL_QUERY = "in:inbox newer_than:30d";
const BACKFILL_MAX_MESSAGES = 200;

interface CandidateBatch {
  messageIds: string[];
  latestHistoryId: string | null;
}

/** Exported for unit testing (see tests/unit/gmail-sync-decision.test.ts) —
 * not part of the module's public barrel (index.ts). */
export async function backfill(userId: string): Promise<CandidateBatch> {
  const messageIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: BACKFILL_QUERY,
      maxResults: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await gmailFetch(userId, `/messages?${params.toString()}`);
    const data = (await res.json()) as {
      messages?: { id: string }[];
      nextPageToken?: string;
    };
    for (const m of data.messages ?? []) messageIds.push(m.id);
    pageToken = data.nextPageToken;
  } while (pageToken && messageIds.length < BACKFILL_MAX_MESSAGES);

  const profileRes = await gmailFetch(userId, "/profile");
  const profile = (await profileRes.json()) as { historyId?: string };

  return {
    messageIds: messageIds.slice(0, BACKFILL_MAX_MESSAGES),
    latestHistoryId: profile.historyId ?? null,
  };
}

/** Exported for unit testing — see backfill()'s comment above. */
export async function incremental(
  userId: string,
  startHistoryId: string
): Promise<CandidateBatch | "stale"> {
  const messageIds: string[] = [];
  let pageToken: string | undefined;
  let latestHistoryId = startHistoryId;

  try {
    do {
      const params = new URLSearchParams({
        startHistoryId,
        historyTypes: "messageAdded",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const res = await gmailFetch(userId, `/history?${params.toString()}`);
      const data = (await res.json()) as {
        history?: { messagesAdded?: { message: { id: string } }[] }[];
        historyId?: string;
        nextPageToken?: string;
      };
      for (const h of data.history ?? []) {
        for (const added of h.messagesAdded ?? []) {
          messageIds.push(added.message.id);
        }
      }
      if (data.historyId) latestHistoryId = data.historyId;
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    if (err instanceof GmailApiError && err.status === 404) {
      return "stale";
    }
    throw err;
  }

  return { messageIds, latestHistoryId };
}

async function processMessage(userId: string, messageId: string): Promise<void> {
  const res = await gmailFetch(userId, `/messages/${messageId}?format=full`);
  const raw = (await res.json()) as GmailMessageResource;
  const parsed = parseMessage(raw);

  const ai = getAIProvider();
  const classification = await resolveEmailClassification(
    { subject: parsed.subject, sender: parsed.sender, body: parsed.bodyText || parsed.snippet },
    ai
  );

  // Extraction is skipped only in the narrow, verified-safe case: Laya
  // classified this email confidently (not the Ollama fallback — reaching
  // fallback already means Laya was unsure) AND it landed on OTHER AND the
  // subject carries zero job-search vocabulary at all. That last check is
  // what keeps this safe against the exact failure this comment used to
  // warn about — real data showed the classifier regularly misfires
  // "Could not classify this email" on obvious application confirmations
  // ("Thanks for applying to X"), and skipping extraction there hid
  // company/role from every downstream consumer. "Thanks for applying to
  // X" contains "applying", so looksJobRelatedByKeyword keeps extraction
  // running for it — this only skips genuinely unrelated mail (bank
  // statements, shipping notices, newsletters).
  const skipExtraction =
    classification.source === "laya" &&
    classification.category === "OTHER" &&
    !looksJobRelatedByKeyword(parsed.subject);

  const extractedData = skipExtraction
    ? null
    : await ai.extractEmailData({ subject: parsed.subject, body: parsed.bodyText || parsed.snippet });

  // Fill in company/role from the deterministic template parser only
  // where the LLM left a placeholder — never overrides a real value it
  // found. See confirmation-fallback.ts for why this exists: the model
  // failed on emails whose body literally states the company as its
  // first line.
  if (extractedData && (isPlaceholderText(extractedData.company) || isPlaceholderText(extractedData.role))) {
    const fallback = extractConfirmationFallback(parsed.subject, parsed.bodyText || parsed.snippet);
    if (isPlaceholderText(extractedData.company) && fallback.company) extractedData.company = fallback.company;
    if (isPlaceholderText(extractedData.role) && fallback.role) extractedData.role = fallback.role;
  }

  const email = await prisma.email.upsert({
    where: { gmailMessageId: parsed.gmailMessageId },
    create: {
      userId,
      gmailMessageId: parsed.gmailMessageId,
      gmailThreadId: parsed.gmailThreadId,
      sender: parsed.sender,
      senderEmail: parsed.senderEmail,
      subject: parsed.subject,
      snippet: parsed.snippet,
      bodyText: parsed.bodyText,
      receivedAt: parsed.receivedAt,
      category: classification.category,
      priority: classification.priority,
      importanceScore: classification.importanceScore,
      actionRequired: classification.actionRequired,
      aiSummary: classification.aiSummary,
      extractedData: extractedData ?? undefined,
      extractedLink: parsed.primaryLink,
      classificationSource: classification.source,
      classificationConfidence: classification.confidence,
    },
    update: {
      category: classification.category,
      priority: classification.priority,
      importanceScore: classification.importanceScore,
      actionRequired: classification.actionRequired,
      aiSummary: classification.aiSummary,
      extractedData: extractedData ?? undefined,
      extractedLink: parsed.primaryLink,
      classificationSource: classification.source,
      classificationConfidence: classification.confidence,
    },
  });

  try {
    await linkEmailAndSuggestStatus({
      userId,
      emailId: email.id,
      gmailThreadId: parsed.gmailThreadId,
      senderEmail: parsed.senderEmail,
      category: classification.category,
      extractedCompany: extractedData?.company ?? null,
    });
  } catch (err) {
    // Linking/suggestion is an enhancement on top of email sync, not core
    // to it — a failure here must never undo the classify/store work that
    // already succeeded above, and must not count against the sync run's
    // error total.
    console.error("[gmail-sync] linking/suggestion failed for", messageId, (err as Error).message);
  }

  try {
    await linkEmailToRecruiter({
      userId,
      emailId: email.id,
      senderName: parsed.sender,
      senderEmail: parsed.senderEmail,
      category: classification.category,
      extractedRecruiterName: extractedData?.recruiterName ?? null,
      extractedRecruiterEmail: extractedData?.recruiterEmail ?? null,
      extractedCompany: extractedData?.company ?? null,
      receivedAt: parsed.receivedAt,
    });
  } catch (err) {
    // Same isolation as the linking/suggestion block above — a recruiter
    // CRM enhancement must never undo the classify/store work above it.
    console.error("[gmail-sync] recruiter linking failed for", messageId, (err as Error).message);
  }
}

/** The single entry point for a Gmail sync run — called from both the
 * server action and the /api/gmail/sync route handler. Never throws;
 * always returns a SyncResult and persists the outcome to GmailSync. */
export async function syncNewMessages(userId: string): Promise<SyncResult> {
  if (!(await isGmailConnected(userId))) {
    const message = "Gmail isn't connected. Sign out and sign in again to grant access.";
    await prisma.gmailSync.upsert({
      where: { userId },
      create: { userId, lastSyncStatus: "error", lastSyncError: message, lastSyncedAt: new Date() },
      update: { lastSyncStatus: "error", lastSyncError: message, lastSyncedAt: new Date() },
    });
    return { status: "error", emailsProcessed: 0, errors: 0, message };
  }

  const existingSync = await prisma.gmailSync.findUnique({ where: { userId } });
  startProgress(userId);

  try {
    let batch: CandidateBatch;
    if (!existingSync?.historyId) {
      batch = await backfill(userId);
    } else {
      const result = await incremental(userId, existingSync.historyId);
      batch = result === "stale" ? await backfill(userId) : result;
    }

    const known = await prisma.email.findMany({
      where: { userId, gmailMessageId: { in: batch.messageIds } },
      select: { gmailMessageId: true },
    });
    const knownIds = new Set(known.map((e) => e.gmailMessageId));
    const newIds = batch.messageIds.filter((id) => !knownIds.has(id));
    updateProgress(userId, { phase: "processing", totalMessages: newIds.length });

    let errors = 0;
    await mapWithConcurrency(newIds, SYNC_CONCURRENCY, async (id) => {
      try {
        await processMessage(userId, id);
      } catch (err) {
        errors++;
        console.error("[gmail-sync] failed to process message", id, (err as Error).message);
      } finally {
        incrementProcessed(userId);
      }
    });

    const processed = newIds.length - errors;
    const status: SyncResult["status"] = errors > 0 && processed === 0 && newIds.length > 0 ? "error" : "success";
    updateProgress(userId, { phase: "matching" });

    // Two independent tracks run concurrently: (job-lead creation, then
    // matching) as one chain, and application auto-tracking as the other.
    // createJobsFromEmailLeads/autoTrackApplicationsFromEmail are provably
    // safe to run concurrently with each other — they require mutually
    // exclusive subject signals (see email-lead-signal.ts's doc comment),
    // so no email row can ever be picked up by both in the same run.
    // matchJobsForUser, however, must run AFTER createJobsFromEmailLeads,
    // not concurrently with it: it queries `Job.match: null` without
    // scoping to "created this run," so racing the two could leave a job
    // this very sync just created unmatched until the next sync — an
    // idempotent but confusing glitch (a job the user opens right after
    // sync finishes would show no match for no visible reason). All three
    // keep their own try/catch, unchanged, so one failing never fails the
    // sync or blocks the others.
    const [jobLeadsAndMatches, applicationsTracked] = await Promise.all([
      (async () => {
        let emailJobsCreated = 0;
        let matchesComputed = 0;
        try {
          const leads = await createJobsFromEmailLeads(userId);
          emailJobsCreated = leads.created;
        } catch (err) {
          console.error("[gmail-sync] email job-lead extraction failed:", (err as Error).message);
        }
        try {
          const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
          if (profile && profile.targetRoles.length > 0) {
            const matchResult = await matchJobsForUser(userId, profile);
            matchesComputed = matchResult.matchesComputed;
          }
        } catch (err) {
          console.error("[gmail-sync] job matching failed:", (err as Error).message);
        }
        return { emailJobsCreated, matchesComputed };
      })(),
      (async () => {
        // Same "just record it, no confirm needed" precedent as the calls
        // above, applied to the first step of application tracking — see
        // auto-track.ts for why this is a deliberate, discussed exception
        // rather than a silent one.
        try {
          const tracked = await autoTrackApplicationsFromEmail(userId);
          return tracked.created;
        } catch (err) {
          console.error("[gmail-sync] auto-tracking applications failed:", (err as Error).message);
          return 0;
        }
      })(),
    ]);
    const { emailJobsCreated, matchesComputed } = jobLeadsAndMatches;

    await prisma.gmailSync.upsert({
      where: { userId },
      create: {
        userId,
        historyId: batch.latestHistoryId,
        lastSyncedAt: new Date(),
        lastSyncStatus: status,
        lastSyncError: null,
        emailsProcessed: processed,
      },
      update: {
        historyId: batch.latestHistoryId ?? existingSync?.historyId,
        lastSyncedAt: new Date(),
        lastSyncStatus: status,
        lastSyncError: null,
        emailsProcessed: processed,
      },
    });

    finishProgress(userId, { phase: "done", emailJobsCreated, matchesComputed, applicationsTracked });
    return { status, emailsProcessed: processed, errors, emailJobsCreated, matchesComputed, applicationsTracked };
  } catch (err) {
    const message =
      err instanceof GmailAuthError
        ? err.message
        : err instanceof GmailRateLimitError
          ? "Gmail rate limit reached — try again shortly."
          : err instanceof GmailNotConnectedError
            ? err.message
            : "Gmail sync failed unexpectedly.";

    console.error("[gmail-sync] run failed", message);
    finishProgress(userId, { phase: "error", error: message });

    await prisma.gmailSync.upsert({
      where: { userId },
      create: { userId, lastSyncStatus: "error", lastSyncError: message, lastSyncedAt: new Date() },
      update: { lastSyncStatus: "error", lastSyncError: message, lastSyncedAt: new Date() },
    });

    return { status: "error", emailsProcessed: 0, errors: 0, message };
  }
}
