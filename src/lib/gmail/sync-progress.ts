/** In-memory sync-progress side-channel, keyed by userId. This is a pure
 * observability layer for the live progress UI — syncNewMessages must
 * (and does) complete correctly whether or not anything ever reads from
 * this store, e.g. a closed browser tab. Every write here is wrapped by
 * the caller so a problem in this module can never break a real sync.
 *
 * Holds process-local state (a Map pinned to globalThis, see below):
 * correct for this project's single-process dev/start deployment model (no
 * serverless or multi-instance setup anywhere in this codebase's notes) and
 * for its single real user — if either of those ever changes, this needs
 * to move to a shared store. */

export interface SyncProgress {
  syncId: string;
  userId: string;
  phase: "fetching" | "processing" | "matching" | "done" | "error";
  totalMessages: number;
  processedMessages: number;
  emailJobsCreated: number;
  matchesComputed: number;
  applicationsTracked: number;
  startedAt: number;
  updatedAt: number;
  error?: string;
}

const STALE_MS = 5 * 60 * 1000;

// A plain module-level Map is NOT reliably shared between a server action
// and a route handler in Next.js dev mode — they can compile into separate
// bundling layers with their own module instance, which silently made this
// store invisible to the polling route while a real sync populated a
// different instance (caught live: startProgress ran, but the /api poll
// always read back null). globalThis is this codebase's own established
// fix for exactly this class of problem — see src/lib/db/prisma.ts's
// globalForPrisma, which exists for the same reason. */
const globalForSyncProgress = globalThis as unknown as { syncProgressStore?: Map<string, SyncProgress> };
const store = globalForSyncProgress.syncProgressStore ?? new Map<string, SyncProgress>();
globalForSyncProgress.syncProgressStore = store;

function pruneStale(): void {
  const now = Date.now();
  for (const [key, value] of store) {
    if (now - value.updatedAt > STALE_MS) store.delete(key);
  }
}

export function startProgress(userId: string): string {
  pruneStale();
  const now = Date.now();
  const syncId = `${userId}-${now}`;
  store.set(userId, {
    syncId,
    userId,
    phase: "fetching",
    totalMessages: 0,
    processedMessages: 0,
    emailJobsCreated: 0,
    matchesComputed: 0,
    applicationsTracked: 0,
    startedAt: now,
    updatedAt: now,
  });
  return syncId;
}

export function updateProgress(userId: string, patch: Partial<SyncProgress>): void {
  const existing = store.get(userId);
  if (!existing) return;
  store.set(userId, { ...existing, ...patch, updatedAt: Date.now() });
}

/** Synchronous read-modify-write — safe under sync.ts's concurrent worker
 * callbacks since Node's single-threaded event loop means there's no
 * `await` between the read and the write here for another callback to
 * interleave with. */
export function incrementProcessed(userId: string): void {
  const existing = store.get(userId);
  if (!existing) return;
  store.set(userId, { ...existing, processedMessages: existing.processedMessages + 1, updatedAt: Date.now() });
}

export function getProgress(userId: string): SyncProgress | null {
  pruneStale();
  return store.get(userId) ?? null;
}

export function finishProgress(userId: string, patch: Partial<SyncProgress>): void {
  updateProgress(userId, { ...patch, phase: patch.phase ?? "done" });
}
