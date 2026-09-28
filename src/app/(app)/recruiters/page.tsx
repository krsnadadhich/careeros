import { getCurrentUser } from "@/lib/auth/session";
import { getRecruitersForUser, splitByFollowUp } from "@/features/recruiters/queries";
import { RecruiterList } from "@/features/recruiters/components/recruiter-list";

export default async function RecruitersPage() {
  const user = await getCurrentUser();
  const recruiters = await getRecruitersForUser(user.id);
  const { needsFollowUp, upToDate } = splitByFollowUp(recruiters);

  return (
    <div className="mx-auto max-w-[900px] px-8 py-6 pb-16">
      <div className="mb-5 text-lg font-semibold">Recruiters</div>
      <RecruiterList needsFollowUp={needsFollowUp} upToDate={upToDate} />
    </div>
  );
}
