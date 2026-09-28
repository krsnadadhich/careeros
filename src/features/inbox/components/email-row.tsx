import Link from "next/link";
import type { Email } from "@prisma/client";
import { formatDate } from "@/lib/utils";

export const PRIORITY_ICON: Record<Email["priority"], string> = {
  CRITICAL: "🚨",
  HIGH: "🔥",
  MEDIUM: "⚠",
  LOW: "·",
};

export function EmailRow({ email }: { email: Email }) {
  return (
    <Link
      href={`/inbox/${email.id}`}
      className="block border-b border-line px-4 py-3.5 last:border-b-0 hover:bg-surface-2"
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-xs">{PRIORITY_ICON[email.priority]}</span>
          <span className="text-[13px] font-semibold">{email.sender}</span>
        </div>
        <span className="text-[11px] text-text3">
          {email.receivedAt ? formatDate(email.receivedAt) : ""}
        </span>
      </div>
      <div className="mt-1 text-[13px]">{email.subject}</div>
      {email.aiSummary ? (
        <div className="mt-1.5 flex gap-2 rounded-md bg-surface-2 px-2.5 py-2 text-xs text-text2">
          <span className="flex-none font-mono text-[9.5px] text-brand">AI</span>
          <span>{email.aiSummary}</span>
        </div>
      ) : (
        email.snippet && (
          <div className="mt-1.5 line-clamp-1 text-xs text-text3">{email.snippet}</div>
        )
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded border border-line px-1.5 py-0.5 text-[10.5px] text-text3">
          {email.category}
        </span>
        {email.actionRequired && (
          <span className="rounded border border-warning-dim bg-warning-dim px-1.5 py-0.5 text-[10.5px] text-warning">
            Action required
          </span>
        )}
      </div>
    </Link>
  );
}
