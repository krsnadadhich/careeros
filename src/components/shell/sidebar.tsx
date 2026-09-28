import type { GmailSync } from "@prisma/client";
import { NAV_ITEMS, SITE_NAME } from "@/config/site";
import { SidebarNavItem } from "./sidebar-nav-item";
import { getAIProvider } from "@/lib/ai/get-ai-provider";

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Sidebar({
  user,
  gmailSync,
}: {
  user: { name?: string | null; email?: string | null };
  gmailSync: GmailSync | null;
}) {
  const aiProvider = getAIProvider();
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  const gmailStatusLabel =
    gmailSync?.lastSyncStatus === "success"
      ? "Connected"
      : gmailSync?.lastSyncStatus === "error"
        ? "Error"
        : "Not connected";
  const gmailStatusClass =
    gmailSync?.lastSyncStatus === "success"
      ? "text-success"
      : gmailSync?.lastSyncStatus === "error"
        ? "text-danger"
        : "text-text3";

  return (
    <aside className="flex w-[222px] flex-none flex-col border-r border-line bg-background">
      <div className="flex items-center gap-2 border-b border-line px-4.5 py-3.5">
        <div className="size-5 flex-none rounded-[5px] bg-brand" />
        <span className="text-sm font-semibold tracking-tight">{SITE_NAME}</span>
      </div>

      <nav className="flex flex-1 flex-col gap-px overflow-y-auto p-2.5">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.id} item={item} />
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-line px-3.5 py-3 text-[11.5px] text-text3">
        <div className="flex justify-between">
          <span>Gmail</span>
          <span className={gmailStatusClass}>{gmailStatusLabel}</span>
        </div>
        {gmailSync?.lastSyncedAt && (
          <div className="flex justify-between">
            <span>Last scan</span>
            <span className="text-text2">{formatRelativeTime(gmailSync.lastSyncedAt)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>AI provider</span>
          <span className="text-text2">{aiProvider.name}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 border-t border-line pt-2.5">
          <div className="flex size-6 flex-none items-center justify-center rounded-full bg-brand-dim text-[11px] font-semibold text-brand">
            {initial}
          </div>
          <div className="truncate text-[12px] text-text2">
            {user.name ?? user.email}
          </div>
        </div>
      </div>
    </aside>
  );
}
