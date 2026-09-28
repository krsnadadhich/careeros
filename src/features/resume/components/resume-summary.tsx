import type { Resume, CandidateProfile } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export function ResumeSummary({
  resume,
  profile,
}: {
  resume: Resume;
  profile: CandidateProfile | null;
}) {
  const parsed = resume.rawText !== null;

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex justify-between">
        <span className="text-text3">File</span>
        <a
          href={`/api/resume/${resume.id}/file`}
          target="_blank"
          rel="noreferrer"
          className="text-brand hover:underline"
        >
          {resume.fileName} →
        </a>
      </div>
      <div className="flex justify-between">
        <span className="text-text3">Version</span>
        <span className="text-text2">{resume.version}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-text3">Uploaded</span>
        <span className="text-text2">{formatDateTime(resume.createdAt)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-text3">Parsing</span>
        <span className={parsed ? "text-success" : "text-warning"}>
          {parsed ? "Parsed" : "Couldn't extract text — fill in manually"}
        </span>
      </div>

      {profile && profile.skills.length > 0 && (
        <div className="mt-2 border-t border-line pt-2.5">
          <div className="mb-1.5 text-text3">Skills (from resume)</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[10.5px] font-normal">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
