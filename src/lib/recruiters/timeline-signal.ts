import type { EmailCategory } from "@prisma/client";

export type TimelineStage =
  | "Applied"
  | "Recruiter Contact"
  | "Interview"
  | "Assessment"
  | "Offer"
  | "Follow-up"
  | "Other";

export interface TimelineSignal {
  category: EmailCategory;
  subject: string;
}

const SUBJECT_KEYWORDS: [string[], TimelineStage][] = [
  [["interview", "phone screen", "screening call"], "Interview"],
  [["assessment", "coding challenge", "take-home", "test"], "Assessment"],
  [["offer", "congratulations"], "Offer"],
  [["applied", "application received", "thank you for applying"], "Applied"],
  [["following up", "checking in", "touch base"], "Follow-up"],
];

const CATEGORY_STAGE: Partial<Record<EmailCategory, TimelineStage>> = {
  INTERVIEWS: "Interview",
  ASSESSMENTS: "Assessment",
  OFFERS: "Offer",
  JOBS: "Applied",
  RECRUITERS: "Recruiter Contact",
};

/** Deterministic email→timeline-stage label, mirroring
 * interview-signal.ts's subject-keyword approach: no LLM call. Subject
 * keywords take priority over Email.category since a specific keyword
 * match ("interview") is a stronger signal than the broader inbox
 * classification category; falls back to category, then to "Other". */
export function classifyTimelineStage(signal: TimelineSignal): TimelineStage {
  const lower = signal.subject.toLowerCase();
  for (const [keywords, stage] of SUBJECT_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return stage;
  }
  return CATEGORY_STAGE[signal.category] ?? "Other";
}
