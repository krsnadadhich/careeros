import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getEmailById } from "@/features/inbox/queries";
import { ensureEmailSummary } from "@/lib/gmail/lazy-summary";
import { EmailDetail } from "@/features/inbox/components/email-detail";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;
  const email = await getEmailById(user.id, id);

  if (!email) notFound();

  const withSummary = await ensureEmailSummary(email);

  return <EmailDetail email={withSummary} />;
}
