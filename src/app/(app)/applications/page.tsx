import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getKanbanColumns } from "@/features/applications/queries";
import { getGmailSyncStatus } from "@/features/inbox/queries";
import { KanbanBoard } from "@/features/applications/components/kanban-board";
import { SyncGmailButton } from "@/features/inbox/components/sync-gmail-button";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  const [columns, gmailSync] = await Promise.all([
    getKanbanColumns(user.id),
    getGmailSyncStatus(user.id),
  ]);
  const total = columns.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="px-8 py-6 pb-16">
      <div className="mb-5 flex items-center justify-between">
        <div className="text-lg font-semibold">Applications</div>
        <div className="flex gap-2">
          {gmailSync && <SyncGmailButton />}
          <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
            + Log Application
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          title="No applications tracked yet"
          description="Sync Gmail to auto-track applications from confirmation emails — or use + Log Application (or Mark as Applied on a job you found via CareerOS) for anything it misses."
        />
      ) : (
        <KanbanBoard columns={columns} />
      )}
    </div>
  );
}
