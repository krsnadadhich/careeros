import { describe, expect, it } from "vitest";
import { buildInterviewPrepInput } from "@/features/interviews/prep";

describe("buildInterviewPrepInput", () => {
  it("uses honest fallback text when there's no prior context, never fabricated example content", () => {
    const { jobDescription } = buildInterviewPrepInput({
      role: "AI Engineer",
      company: "Acme",
      jobDescription: "Build LLM products.",
      interviewType: null,
      previousCommunication: [],
      priorInterviewNotes: [],
    });

    expect(jobDescription).toContain("No linked emails on record yet");
    expect(jobDescription).toContain("No completed prior rounds on record");
    // must never contain the spec's own illustrative example topics —
    // those are not real data for this application.
    expect(jobDescription).not.toContain("RAG, Evaluation, Metadata filtering");
  });

  it("includes every real data point verbatim when context exists", () => {
    const { jobDescription, role } = buildInterviewPrepInput({
      role: "AI Engineer",
      company: "Acme Corp",
      jobDescription: "Build LLM products with RAG.",
      interviewType: "Technical",
      previousCommunication: [
        { subject: "Interview invitation", summary: "Scheduled for next week", receivedAt: new Date("2026-01-01") },
      ],
      priorInterviewNotes: [{ type: "Phone Screen", notes: "Asked about Python and RAG pipelines." }],
    });

    expect(role).toBe("AI Engineer");
    expect(jobDescription).toContain("Acme Corp");
    expect(jobDescription).toContain("Technical");
    expect(jobDescription).toContain("Interview invitation");
    expect(jobDescription).toContain("Scheduled for next week");
    expect(jobDescription).toContain("Phone Screen");
    expect(jobDescription).toContain("Asked about Python and RAG pipelines.");
  });

  it("falls back to honest text when jobDescription is null", () => {
    const { jobDescription } = buildInterviewPrepInput({
      role: "AI Engineer",
      company: "Acme",
      jobDescription: null,
      interviewType: null,
      previousCommunication: [],
      priorInterviewNotes: [],
    });
    expect(jobDescription).toContain("No job description on record.");
  });
});
