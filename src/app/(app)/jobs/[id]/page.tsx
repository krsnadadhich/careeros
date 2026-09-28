import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getJobWithMatch } from "@/features/jobs/queries";
import { JobDetail } from "@/features/jobs/components/job-detail";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;
  const job = await getJobWithMatch(user.id, id);

  if (!job) notFound();

  return <JobDetail job={job} />;
}
