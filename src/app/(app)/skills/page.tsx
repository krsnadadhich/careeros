import { getCurrentUser } from "@/lib/auth/session";
import { getSkillFrequenciesForUser, getSkillGapsForUser } from "@/features/skills/queries";
import { SkillFrequencyList } from "@/features/skills/components/skill-frequency-list";
import { SkillGapList } from "@/features/skills/components/skill-gap-list";

export default async function SkillsPage() {
  const user = await getCurrentUser();
  const [skills, gaps] = await Promise.all([
    getSkillFrequenciesForUser(user.id),
    getSkillGapsForUser(user.id),
  ]);

  return (
    <div className="mx-auto max-w-[900px] px-8 py-6 pb-16">
      <div className="mb-1 text-lg font-semibold">Skills</div>
      <p className="mb-6 max-w-xl text-xs text-text3">
        How often each of your resume skills actually comes up across the roles you&apos;ve matched
        with. High relevance means a skill keeps showing up in the roles you&apos;re targeting; low
        relevance means it rarely does.
      </p>
      <SkillFrequencyList skills={skills} />

      <div className="mb-1 mt-8 text-[13px] font-semibold">Skill Gaps</div>
      <p className="mb-6 max-w-xl text-xs text-text3">
        Skills your matched jobs ask for that aren&apos;t on your resume, ranked by how often they
        show up — the ones worth learning first.
      </p>
      <SkillGapList gaps={gaps} />
    </div>
  );
}
