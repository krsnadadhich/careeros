import { formatDate } from "@/lib/utils";

export interface InterviewPrepContext {
  role: string;
  company: string;
  jobDescription: string | null;
  interviewType: string | null;
  previousCommunication: { subject: string; summary: string | null; receivedAt: Date | null }[];
  priorInterviewNotes: { type: string | null; notes: string }[];
}

/** Builds the (jobDescription, role) input for AIProvider.generateInterviewPrep()
 * by concatenating real, labeled sections — no interface change, all
 * enrichment happens here. Every section has an honest "none on record"
 * fallback so nothing is fabricated when the data doesn't exist yet. */
export function buildInterviewPrepInput(ctx: InterviewPrepContext): {
  jobDescription: string;
  role: string;
} {
  const communicationSection = ctx.previousCommunication.length
    ? ctx.previousCommunication
        .map(
          (e) =>
            `- [${e.receivedAt ? formatDate(e.receivedAt) : "undated"}] ${e.subject}: ${e.summary ?? "(no summary)"}`
        )
        .join("\n")
    : "No linked emails on record yet for this application.";

  const notesSection = ctx.priorInterviewNotes.length
    ? ctx.priorInterviewNotes.map((i) => `- ${i.type ?? "Round"}: ${i.notes}`).join("\n")
    : "No completed prior rounds on record — this is the first interview logged for this application.";

  const jobDescription = [
    `Company: ${ctx.company}`,
    `Role: ${ctx.role}`,
    `Interview round: ${ctx.interviewType ?? "Not specified"}`,
    "",
    "--- Job Description ---",
    ctx.jobDescription ?? "No job description on record.",
    "",
    "--- Previous Communication (from linked emails, most recent first) ---",
    communicationSection,
    "",
    "--- Previously Asked Questions / Prior Round Notes (from earlier completed interviews for this application) ---",
    notesSection,
  ].join("\n");

  return { jobDescription, role: ctx.role };
}
