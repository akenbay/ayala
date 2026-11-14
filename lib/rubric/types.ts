export type Dimension =
  | "clear_direction"
  | "calm_respectful"
  | "emotional_response"
  | "boundaries"
  | "positive_guidance";

export const DIMENSIONS: Dimension[] = [
  "clear_direction",
  "calm_respectful",
  "emotional_response",
  "boundaries",
  "positive_guidance",
];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  clear_direction: "Clear direction",
  calm_respectful: "Calm and respectful",
  emotional_response: "Names the feeling",
  boundaries: "Holds the limit",
  positive_guidance: "Positive guidance",
};

export type CheckId =
  | "states_not_asks"
  | "one_direction"
  | "specific_action"
  | "says_what_to_do"
  | "no_yelling"
  | "no_shaming"
  | "no_empty_threats"
  | "acknowledges_feeling"
  | "states_limit"
  | "no_bribe"
  | "warning_is_calm"
  | "two_ok_choices"
  | "alternative_or_praise";

export type CheckResult = {
  id: CheckId;
  label: string;
  dimension: Dimension;
  passed: boolean;
  points: number; // earned
  maxPoints: number;
  evidence: string | null; // exact quote from the parent's text
  explanation: string; // one plain sentence
  source: "code" | "llm";
  cdcBasis: string;
};

export type Scorecard = {
  total: number; // 0 to 100
  byDimension: Record<Dimension, { earned: number; max: number }>;
  checks: CheckResult[];
  degraded: boolean; // true if the model call failed or was unavailable
  notes: string[];
  stats: { words: number; avgSentenceLength: number; longHint: boolean };
};

/** A semantic verdict produced by the language model for one check. */
export type LlmVerdict = {
  id: CheckId;
  passed: boolean;
  quote: string | null;
  reason: string;
};
