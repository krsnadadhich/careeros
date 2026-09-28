import { getCurrentUser } from "@/lib/auth/session";
import { getGmailSyncStatus } from "@/features/inbox/queries";
import { GmailStatusCard } from "@/features/inbox/components/gmail-status-card";
import { ResumeProfileCard } from "@/features/resume/components/resume-profile-card";
import { AiStatusCard } from "@/features/settings/components/ai-status-card";
import { getAIProvider } from "@/lib/ai/get-ai-provider";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const gmailSync = await getGmailSyncStatus(user.id);
  const providerName = getAIProvider().name;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-8 py-6 pb-16">
      <GmailStatusCard gmailSync={gmailSync} />
      <ResumeProfileCard userId={user.id} />
      <AiStatusCard providerName={providerName} />
    </div>
  );
}
