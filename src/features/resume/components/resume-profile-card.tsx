import { getPrimaryResume, getCandidateProfile } from "../queries";
import { ResumeUploadForm } from "./resume-upload-form";
import { ResumeSummary } from "./resume-summary";
import { ProfileEditForm } from "./profile-edit-form";

export async function ResumeProfileCard({ userId }: { userId: string }) {
  const [resume, profile] = await Promise.all([
    getPrimaryResume(userId),
    getCandidateProfile(userId),
  ]);

  return (
    <div className="rounded-lg border border-line bg-surface-1 px-5 py-4.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold">Resume & Profile</div>
        <ResumeUploadForm label={resume ? "Replace resume" : "Upload"} />
      </div>

      <div className="mt-3">
        {resume ? (
          <ResumeSummary resume={resume} profile={profile} />
        ) : (
          <p className="text-xs text-text3">You haven&apos;t uploaded a resume yet.</p>
        )}
      </div>

      {/* Keyed on updatedAt so the form remounts with fresh defaultValues
          after a save, instead of Base UI warning about an uncontrolled
          input's defaultValue changing post-mount. */}
      <ProfileEditForm key={profile?.updatedAt.toISOString() ?? "new"} profile={profile} />
    </div>
  );
}
