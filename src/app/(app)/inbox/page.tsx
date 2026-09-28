import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getFilteredEmails, INBOX_TABS, type InboxTab } from "@/features/inbox/queries";
import { EmailList } from "@/features/inbox/components/email-list";
import { SyncGmailButton } from "@/features/inbox/components/sync-gmail-button";
import { cn } from "@/lib/utils";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  const { tab: tabParam } = await searchParams;
  const tab = (INBOX_TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as InboxTab)
    : "All";

  const emails = await getFilteredEmails(user.id, tab);

  return (
    <div className="mx-auto max-w-[1000px] px-8 py-6 pb-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {INBOX_TABS.map((t) => (
            <Link
              key={t}
              href={t === "All" ? "/inbox" : `/inbox?tab=${t}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12.5px]",
                tab === t ? "bg-surface-2 text-foreground" : "text-text2 hover:bg-surface-2"
              )}
            >
              {t}
            </Link>
          ))}
        </div>
        <SyncGmailButton />
      </div>
      <EmailList emails={emails} />
    </div>
  );
}
