import type { GmailSync } from "@prisma/client";
import { isGoogleAuthConfigured } from "@/config/env";
import { formatDateTime } from "@/lib/utils";
import { SyncGmailButton } from "./sync-gmail-button";
import { ReconnectGmailButton } from "./reconnect-gmail-button";

export function GmailStatusCard({ gmailSync }: { gmailSync: GmailSync | null }) {
  if (!isGoogleAuthConfigured) {
    return (
      <div className="rounded-lg border border-line bg-surface-1 px-5 py-4.5">
        <div className="text-[13px] font-semibold">Gmail</div>
        <p className="mt-2 text-xs text-text3">
          Google sign-in isn&apos;t configured yet. Add GOOGLE_CLIENT_ID and
          GOOGLE_CLIENT_SECRET to .env to connect Gmail.
        </p>
      </div>
    );
  }

  const status = gmailSync?.lastSyncStatus ?? "never";

  return (
    <div className="rounded-lg border border-line bg-surface-1 px-5 py-4.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold">Gmail</div>
        <div className="flex gap-1.5">
          {status === "error" && <ReconnectGmailButton />}
          <SyncGmailButton />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-text3">Status</span>
          <span
            className={
              status === "success" ? "text-success" : status === "error" ? "text-danger" : "text-text3"
            }
          >
            {status === "never" ? "Not synced yet" : status === "success" ? "Connected" : "Error"}
          </span>
        </div>
        {gmailSync?.lastSyncedAt && (
          <div className="flex justify-between">
            <span className="text-text3">Last sync</span>
            <span className="text-text2">{formatDateTime(gmailSync.lastSyncedAt)}</span>
          </div>
        )}
        {gmailSync && (
          <div className="flex justify-between">
            <span className="text-text3">Emails processed (last run)</span>
            <span className="text-text2">{gmailSync.emailsProcessed}</span>
          </div>
        )}
        {gmailSync?.lastSyncError && (
          <div className="mt-1 rounded border border-danger/30 bg-danger/10 px-2.5 py-2 text-danger">
            {gmailSync.lastSyncError}
          </div>
        )}
      </div>
    </div>
  );
}
