import { getCurrentUser } from "@/lib/auth/session";
import { getApplicationsForScheduling, getInterviewDateHint } from "@/features/interviews/queries";
import { ScheduleInterviewForm } from "@/features/interviews/components/schedule-interview-form";

export default async function NewInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string }>;
}) {
  const user = await getCurrentUser();
  const { applicationId } = await searchParams;

  const applications = await getApplicationsForScheduling(user.id);
  const dateHint = applicationId ? await getInterviewDateHint(user.id, applicationId) : null;

  return (
    <div className="mx-auto max-w-[600px] px-8 py-6 pb-16">
      <div className="mb-5 text-lg font-semibold">Schedule Interview</div>
      <ScheduleInterviewForm
        applications={applications}
        defaultApplicationId={applicationId}
        defaultDateHint={dateHint}
      />
    </div>
  );
}
