import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getInterviewsForUser, getInterviewSuggestions, splitUpcomingAndPast } from "@/features/interviews/queries";
import { InterviewList } from "@/features/interviews/components/interview-list";
import { SuggestedInterviews } from "@/features/interviews/components/suggested-interviews";
import { buttonVariants } from "@/components/ui/button";

export default async function InterviewsPage() {
  const user = await getCurrentUser();
  const [interviews, suggestions] = await Promise.all([
    getInterviewsForUser(user.id),
    getInterviewSuggestions(user.id),
  ]);
  const { upcoming, past } = splitUpcomingAndPast(interviews);

  return (
    <div className="mx-auto max-w-[900px] px-8 py-6 pb-16">
      <div className="mb-5 flex items-center justify-between">
        <div className="text-lg font-semibold">Interviews</div>
        <Link href="/interviews/new" className={buttonVariants({ size: "sm" })}>
          + Schedule Interview
        </Link>
      </div>
      <SuggestedInterviews suggestions={suggestions} />
      <InterviewList upcoming={upcoming} past={past} />
    </div>
  );
}
