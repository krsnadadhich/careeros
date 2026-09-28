"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import { AskAiPanel } from "./ask-ai-panel";
import { ThemeToggle } from "./theme-toggle";
import { VIEW_TITLES } from "@/config/site";

export function TopBar({ notifications }: { notifications: NotificationItem[] }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const pathname = usePathname();
  const [segment, subSegment] = pathname.split("/").filter(Boolean);
  const title = segment === "jobs" && subSegment ? "Job Detail" : VIEW_TITLES[segment ?? ""] ?? "Overview";

  return (
    <>
      <div className="flex h-13 flex-none items-center justify-between border-b border-line px-4.5">
        <div className="text-[13px] font-semibold text-text2 capitalize">{title}</div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("careeros:open-palette"))}
            className="flex w-55 items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-xs text-text3 hover:border-line-strong"
          >
            <Search className="size-3.5" />
            <span>Search jobs, emails…</span>
            <span className="ml-auto rounded border border-line bg-surface-1 px-1 font-mono text-[10px]">
              ⌘K
            </span>
          </button>

          <NotificationBell notifications={notifications} />
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setAssistantOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md bg-brand-dim px-3 py-1.5 text-xs font-semibold text-brand"
          >
            <Sparkles className="size-3.5" />
            Ask AI
          </button>
        </div>
      </div>

      <AskAiPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  );
}
