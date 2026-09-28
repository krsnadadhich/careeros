import { layaPredict } from "./client";
import type { LayaQuestion } from "./types";

const EXPERIENCE_LEVELS = [
  "far below what this job needs",
  "somewhat below what this job needs",
  "a good match for what this job needs",
  "exceeds what this job needs",
];

const ROLE_FIT_LEVELS = ["a poor fit for this role", "a partial fit for this role", "a strong fit for this role"];

/** Laya's per-question token budget is much tighter than Ollama's — see
 * score-job plan: ~320 tokens for the state portion (checkpoint
 * max_len=512 minus head_max_len=192). resumeText/jobDescription can each
 * be thousands of characters, so this truncates far harder than the
 * existing Ollama path's 3000-char slices, specifically for this call. */
const LAYA_FIELD_CHAR_CAP = 600;

function buildQuestions(): Record<string, LayaQuestion> {
  return {
    experience_fit: {
      type: "score",
      instructions: "How well does the candidate's experience in `resume` match the seniority and experience this `job` needs?",
      criteria: EXPERIENCE_LEVELS,
    },
    role_fit: {
      type: "score",
      instructions: "How well does the candidate's background in `resume` fit the responsibilities and focus described in `job`?",
      criteria: ROLE_FIT_LEVELS,
    },
  };
}

function normalizeScore(score: number, levels: string[]): { value: number; levelIndex: number } {
  const maxIndex = levels.length - 1;
  const ratio = Math.min(Math.max(score / maxIndex, 0), 1);
  const levelIndex = Math.min(Math.max(Math.round(score), 0), maxIndex);
  return { value: Math.round(ratio * 100), levelIndex };
}

export interface LayaJobScore {
  experienceScore: number;
  roleScore: number;
  /** A template of the chosen levels' own text — never generated, so it
   * can only ever say one of the sentences defined in this file. */
  rationale: string;
}

export interface LayaScoreResult {
  result: LayaJobScore;
  confidences: number[];
}

/** Scores one job against a resume via laya's structured questions —
 * replaces just the experienceScore/roleScore/rationale slice of
 * computeMatchForJob; skillsScore/locationScore are already deterministic
 * and untouched. Returns null on any network error or unexpected
 * response so the caller falls back to AIProvider.matchJob(), identical
 * error contract to classifyEmailWithLaya. */
export async function scoreJobWithLaya(input: {
  resumeText: string;
  jobDescription: string;
}): Promise<LayaScoreResult | null> {
  const state = {
    resume: input.resumeText.slice(0, LAYA_FIELD_CHAR_CAP),
    job: input.jobDescription.slice(0, LAYA_FIELD_CHAR_CAP),
  };
  const response = await layaPredict(state, buildQuestions());
  if (!response) return null;

  const experienceFit = response.answers.experience_fit;
  const roleFit = response.answers.role_fit;
  if (experienceFit?.type !== "score" || roleFit?.type !== "score") {
    console.warn("[laya-score-job] unexpected answer shape from laya", response.answers);
    return null;
  }

  const experience = normalizeScore(experienceFit.score, EXPERIENCE_LEVELS);
  const role = normalizeScore(roleFit.score, ROLE_FIT_LEVELS);

  return {
    result: {
      experienceScore: experience.value,
      roleScore: role.value,
      rationale: `Experience: ${EXPERIENCE_LEVELS[experience.levelIndex]}. Role fit: ${ROLE_FIT_LEVELS[role.levelIndex]}.`,
    },
    confidences: [experienceFit.answer_confidence, roleFit.answer_confidence],
  };
}
