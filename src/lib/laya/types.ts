/** Question/answer shapes for laya's `/v1/systemone` contract — confirmed
 * against the installed `laya` package's own source (agent.py) and a real
 * request/response round trip, not just its docs. */

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  /** Level descriptions, index 0 first — the returned `score` is the
   * expected value over these indices, not a fixed 0-100 range. */
  criteria: string[];
}

export interface NoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export type LayaQuestion = ChoiceQuestion | ScoreQuestion | NoulQuestion;

interface LayaAnswerBase {
  /** The calibrated confidence, comparable across choice/score/noul —
   * use this one for threshold gating, not `confidence`. */
  answer_confidence: number;
  confidence: number;
}

export interface ChoiceAnswer extends LayaAnswerBase {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
}

export interface ScoreAnswer extends LayaAnswerBase {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
}

export interface NoulAnswer extends LayaAnswerBase {
  type: "noul";
  /** P(true), 0-1. */
  noul: number;
}

export type LayaAnswer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export interface LayaPredictResponse {
  model: string;
  answers: Record<string, LayaAnswer>;
  usage: { input_tokens: number; output_tokens: number };
}
