import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getRecruiterDetail } from "@/features/recruiters/queries";
import { RecruiterDetail } from "@/features/recruiters/components/recruiter-detail";

export default async function RecruiterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;

  const recruiter = await getRecruiterDetail(user.id, id);
  if (!recruiter) notFound();

  return (
    <div className="mx-auto max-w-[760px] px-8 py-6 pb-16">
      <RecruiterDetail recruiter={recruiter} />
    </div>
  );
}
