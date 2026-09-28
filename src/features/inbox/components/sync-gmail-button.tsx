"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncGmailAction } from "../actions";
import type { SyncProgress } from "@/lib/gmail/sync-progress";

const POLL_INTERVAL_MS = 1000;

export function SyncGmailButton() {
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPending) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    // Pure UI side-channel — if a poll fails or the sync finishes before
    // the next tick, the real sync result (awaited in onClick below) is
    // still what drives the toast; this just stops rendering stale numbers.
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/gmail/sync-progress");
        if (res.ok) setProgress(await res.json());
      } catch {
        // best-effort — the actual sync doesn't depend on this
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [isPending]);

  function onClick() {
    startTransition(async () => {
      const result = await syncGmailAction();
      setProgress(null);
      if (result.status === "success") {
        const suffix = result.errors > 0 ? ` (${result.errors} failed)` : "";
        const parts = [`Synced ${result.emailsProcessed} email${result.emailsProcessed === 1 ? "" : "s"}${suffix}`];
        if (result.emailJobsCreated) {
          parts.push(`found ${result.emailJobsCreated} new job listing${result.emailJobsCreated === 1 ? "" : "s"}`);
        }
        if (result.matchesComputed) {
          parts.push(`scored ${result.matchesComputed} match${result.matchesComputed === 1 ? "" : "es"}`);
        }
        if (result.applicationsTracked) {
          parts.push(`tracked ${result.applicationsTracked} application${result.applicationsTracked === 1 ? "" : "s"}`);
        }
        toast.success(parts.join(", "));
      } else {
        toast.error(result.message ?? "Gmail sync failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={isPending} onClick={onClick}>
        {isPending ? "Syncing…" : "Sync Gmail"}
      </Button>
      {isPending && progress && <span className="text-xs text-text3">{describeProgress(progress)}</span>}
    </div>
  );
}

function describeProgress(progress: SyncProgress): string {
  switch (progress.phase) {
    case "fetching":
      return "Fetching messages…";
    case "processing":
      return progress.totalMessages > 0
        ? `${progress.processedMessages}/${progress.totalMessages} emails`
        : "Processing…";
    case "matching":
      return "Matching jobs…";
    default:
      return "Finishing…";
  }
}
