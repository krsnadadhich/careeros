import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getInterviewDetail, getLinkedEmailsForApplication } from "@/features/interviews/queries";
import { InterviewPrepView } from "@/features/interviews/components/interview-prep-view";

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  const interview = await getInterviewDetail(user.id, id);
  if (!interview) notFound();

  const linkedEmails = await getLinkedEmailsForApplication(user.id, interview.application.jobId);
  const priorRounds = interview.application.interviews.filter((i) => i.id !== interview.id);

  return (
    <div className="mx-auto max-w-[760px] px-8 py-6 pb-16">
      <InterviewPrepView interview={interview} linkedEmails={linkedEmails} priorRounds={priorRounds} />
    </div>
  );
}
