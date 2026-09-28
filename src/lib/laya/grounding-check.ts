import type { ContextAvailability } from "@/lib/context/availability";
import { layaPredict } from "./client";
import { meetsConfidence } from "./confidence";
import type { LayaQuestion } from "./types";

const TOPICS: Record<string, string> = {
  emails: "the user's synced emails or inbox",
  applications: "job applications the user has submitted or their status",
  interviews: "interview scheduling or prep",
  job_matches: "job listings or how well they match the user's resume",
  recruiters: "recruiter contacts or follow-up",
  tasks: "to-do items or reminders",
  general: "general advice, or anything not tied to one specific area above",
};

const TOPIC_TO_AVAILABILITY_KEY: Record<string, keyof ContextAvailability | undefined> = {
  emails: "emails",
  applications: "applications",
  interviews: "interviews",
  job_matches: "jobMatches",
  recruiters: "recruiters",
  tasks: "tasks",
  general: undefined,
};

const INSUFFICIENT_MESSAGES: Record<keyof ContextAvailability, string> = {
  emails: "I don't have any synced emails yet — connect Gmail in Settings and I'll be able to answer that.",
  applications:
    "I don't have any tracked applications yet — log one or wait for a status update email to sync, and I'll be able to answer that.",
  interviews: "I don't have any interviews on record yet — schedule one from the Interviews page and I'll be able to answer that.",
  jobMatches: "I don't have any strong job matches computed yet — scan for jobs from the Jobs page and I'll be able to answer that.",
  recruiters: "I don't have any recruiters currently needing follow-up.",
  tasks: "You don't have any open tasks right now.",
};

function buildQuestions(): Record<string, LayaQuestion> {
  return {
    topic: {
      type: "choice",
      instructions: "What is `question` mainly asking about?",
      criteria: TOPICS,
    },
  };
}

export type GroundingResult = { sufficient: true } | { sufficient: false; message: string };

/** Decides whether `question` can be answered from the user's real data
 * before the real model is asked — classifies the QUESTION (not the
 * digest text, which is too long for Laya's token budget and would risk
 * false negatives from truncation) into a topic, then looks up whether
 * that topic's digest section actually has content.
 *
 * Fails open in every uncertain case (unreachable sidecar, low
 * confidence, "general", an unmapped topic) — this can only skip a call
 * the model would have answered correctly anyway, never block a
 * question the assistant could actually help with. */
export async function checkGroundingWithLaya(
  question: string,
  availability: ContextAvailability
): Promise<GroundingResult> {
  if (!question.trim()) return { sufficient: true };

  const response = await layaPredict({ question }, buildQuestions());
  if (!response) return { sufficient: true };

  const topic = response.answers.topic;
  if (topic?.type !== "choice") return { sufficient: true };
  if (!meetsConfidence([topic.answer_confidence])) return { sufficient: true };

  const key = TOPIC_TO_AVAILABILITY_KEY[topic.choice];
  if (!key) return { sufficient: true };

  if (availability[key]) return { sufficient: true };
  return { sufficient: false, message: INSUFFICIENT_MESSAGES[key] };
}
