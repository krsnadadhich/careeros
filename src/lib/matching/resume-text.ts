export interface ResumeTextInput {
  resume: { rawText: string | null } | null;
  profile: {
    headline: string | null;
    yearsExperience: number | null;
    targetRoles: string[];
    skills: string[];
  };
}

/** Uses the real uploaded resume's text when available; otherwise
 * synthesizes a labeled block from real CandidateProfile fields (never
 * fabricated data — matching is optional-resume-friendly since Phase 4
 * already allows scanning with just a profile, no PDF uploaded). Never
 * returns an empty string, which would produce a garbage AI rationale. */
export function buildResumeText({ resume, profile }: ResumeTextInput): string {
  if (resume?.rawText && resume.rawText.trim().length > 0) {
    return resume.rawText;
  }

  const lines: string[] = [];
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.yearsExperience != null) lines.push(`Years of experience: ${profile.yearsExperience}`);
  if (profile.targetRoles.length > 0) lines.push(`Target roles: ${profile.targetRoles.join(", ")}`);
  if (profile.skills.length > 0) lines.push(`Skills: ${profile.skills.join(", ")}`);

  if (lines.length === 0) {
    return "No resume or profile details provided yet.";
  }
  return lines.join("\n");
}
