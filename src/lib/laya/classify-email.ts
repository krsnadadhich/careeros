import type { z } from "zod";
import { EmailCategoryEnum } from "@/lib/ai/types";
import { layaPredict } from "./client";
import type { LayaQuestion } from "./types";

const EMAIL_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  JOBS: "a new job posting, listing, or job alert from a board or company",
  RECRUITERS: "outreach from a recruiter or hiring manager about a role",
  INTERVIEWS: "scheduling, confirming, or details about an interview",
  ASSESSMENTS: "a coding test, take-home assignment, or screening assessment",
  OFFERS: "a job offer or offer negotiation",
  REJECTION: "a rejection or application not moving forward",
  OTHER: "not related to a job search at all",
};

const URGENCY_LEVELS = ["no time pressure", "needs attention soon", "blocking issue or hard deadline"];

function buildQuestions(): Record<string, LayaQuestion> {
  return {
    category: {
      type: "choice",
      instructions: "Which category does this email belong to?",
      criteria: EMAIL_CATEGORY_DESCRIPTIONS,
    },
    urgency: {
      type: "score",
      instructions: "How urgent is the request in the email body?",
      criteria: URGENCY_LEVELS,
    },
    needs_reply: {
      type: "noul",
      instructions: "Does the sender expect a reply from the recipient?",
    },
  };
}

export interface LayaEmailClassification {
  category: z.infer<typeof EmailCategoryEnum>;
  priority: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
  importanceScore: number;
  actionRequired: boolean;
}

export interface LayaClassifyResult {
  result: LayaEmailClassification;
  confidences: number[];
}

/** Classifies one email via laya's structured questions — produces only
 * the "safe to file this automatically" fields (category/priority/
 * actionRequired/importanceScore), never a generated summary (see
 * `AIProvider.summarizeEmail` for why that stays separate, generated
 * lazily). Returns `null` on any network error or unexpected/invalid
 * response so the caller falls back to Ollama's `classifyEmail` — laya
 * can never emit "CRITICAL" (its urgency scale tops out at "blocking
 * issue or hard deadline", mapped to HIGH), which is an accepted
 * simplification since CRITICAL was never reliably distinguished from
 * HIGH by classification alone anyway. */
export async function classifyEmailWithLaya(input: {
  subject: string;
  sender: string;
  body: string;
}): Promise<LayaClassifyResult | null> {
  const state = { subject: input.subject, body: input.body, from: input.sender };
  const response = await layaPredict(state, buildQuestions());
  if (!response) return null;

  const category = response.answers.category;
  const urgency = response.answers.urgency;
  const needsReply = response.answers.needs_reply;
  if (category?.type !== "choice" || urgency?.type !== "score" || needsReply?.type !== "noul") {
    console.warn("[laya-classify-email] unexpected answer shape from laya", response.answers);
    return null;
  }

  const categoryParsed = EmailCategoryEnum.safeParse(category.choice);
  if (!categoryParsed.success) {
    console.warn("[laya-classify-email] unrecognized category from laya", category.choice);
    return null;
  }

  const maxUrgencyIndex = URGENCY_LEVELS.length - 1;
  const urgencyRatio = Math.min(Math.max(urgency.score / maxUrgencyIndex, 0), 1);
  const priority: LayaEmailClassification["priority"] =
    urgencyRatio >= 0.75 ? "HIGH" : urgencyRatio >= 0.4 ? "MEDIUM" : "LOW";

  return {
    result: {
      category: categoryParsed.data,
      priority,
      importanceScore: Math.round(urgencyRatio * 100),
      actionRequired: needsReply.noul >= 0.5,
    },
    confidences: [category.answer_confidence, urgency.answer_confidence, needsReply.answer_confidence],
  };
}
