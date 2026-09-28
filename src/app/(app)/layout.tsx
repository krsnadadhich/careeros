import { getCurrentUser } from "@/lib/auth/session";
import { getNotifications } from "@/features/dashboard/queries";
import { getGmailSyncStatus } from "@/features/inbox/queries";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const [notifications, gmailSync] = await Promise.all([
    getNotifications(user.id),
    getGmailSyncStatus(user.id),
  ]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar user={user} gmailSync={gmailSync} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar notifications={notifications} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
      <CommandPalette />
    </div>
  );
}
