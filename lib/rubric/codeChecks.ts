import { CDC } from "./cdc";
import * as P from "./patterns";
import type { CheckId, CheckResult, Dimension } from "./types";

/**
 * A code check result. `definite` means the code is certain and always wins over
 * the language model. Heuristic results can be replaced by a verified model verdict.
 */
export type CodeCheck = CheckResult & { definite: boolean };

type Meta = { label: string; dimension: Dimension; maxPoints: number; cdcBasis: string };

export const CHECK_META: Record<CheckId, Meta> = {
  states_not_asks: { label: "States the direction, doesn't ask", dimension: "clear_direction", maxPoints: 8, cdcBasis: CDC.directions.name },
  one_direction: { label: "One direction at a time", dimension: "clear_direction", maxPoints: 5, cdcBasis: CDC.goodDirections.name },
  specific_action: { label: "Specific action, not vague", dimension: "clear_direction", maxPoints: 8, cdcBasis: CDC.goodDirections.name },
  says_what_to_do: { label: "Says what to do, not only what to stop", dimension: "clear_direction", maxPoints: 4, cdcBasis: CDC.directions.name },
  no_yelling: { label: "No yelling", dimension: "calm_respectful", maxPoints: 6, cdcBasis: CDC.responding.name },
  no_shaming: { label: "No insults, shaming or hitting", dimension: "calm_respectful", maxPoints: 8, cdcBasis: CDC.responding.name },
  no_empty_threats: { label: "No empty or outsized threats", dimension: "calm_respectful", maxPoints: 6, cdcBasis: CDC.consequences.name },
  acknowledges_feeling: { label: "Names the feeling or wish", dimension: "emotional_response", maxPoints: 20, cdcBasis: CDC.timeIn.name },
  states_limit: { label: "States the limit clearly", dimension: "boundaries", maxPoints: 10, cdcBasis: CDC.consequences.name },
  no_bribe: { label: "No bribe, no backing down", dimension: "boundaries", maxPoints: 5, cdcBasis: CDC.consequences.name },
  warning_is_calm: { label: "Any warning is calm and doable", dimension: "boundaries", maxPoints: 5, cdcBasis: CDC.consequences.name },
  two_ok_choices: { label: "Offers two acceptable choices", dimension: "positive_guidance", maxPoints: 8, cdcBasis: CDC.goodDirections.name },
  alternative_or_praise: { label: "Gives an alternative or specific praise", dimension: "positive_guidance", maxPoints: 7, cdcBasis: CDC.responding.name },
};

/** Checks that only fail when something bad is present. They earn half points if nothing constructive was said. */
export const ABSENCE_CHECKS: CheckId[] = [
  "states_not_asks", "one_direction", "says_what_to_do", "no_yelling",
  "no_shaming", "no_empty_threats", "no_bribe", "warning_is_calm",
];

/** Checks that reward something good the parent said. */
export const CONSTRUCTIVE_CHECKS: CheckId[] = [
  "specific_action", "acknowledges_feeling", "states_limit", "two_ok_choices", "alternative_or_praise",
];

function make(id: CheckId, passed: boolean, evidence: string | null, explanation: string, definite: boolean): CodeCheck {
  const m = CHECK_META[id];
  return {
    id,
    label: m.label,
    dimension: m.dimension,
    passed,
    points: passed ? m.maxPoints : 0,
    maxPoints: m.maxPoints,
    evidence,
    explanation,
    source: "code",
    cdcBasis: m.cdcBasis,
    definite,
  };
}

// ---------- text helpers ----------

export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Splits a sentence into clauses on "and", "then" and commas. Choices joined by "or" stay together. */
export function clauses(sentence: string): string[] {
  return sentence
    .split(/,\s*(?:and\s+)?(?:then\s+)?|\s+and\s+(?:then\s+)?|\s+then\s+|;\s*/i)
    .map((c) => c.trim())
    .filter(Boolean);
}

function stripEndPunct(s: string): string {
  return s.replace(/[\s.!?]+$/, "");
}

/** Returns the exact substring of `text` matched by `re`, or null. */
export function quote(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[0].trim() : null;
}

function isNegativeImperative(clause: string): boolean {
  return /^(please\s+)?(stop|don'?t|dont|do not|quit|never|no)\b/i.test(clause.trim());
}

function isChoiceSentence(s: string): boolean {
  return P.CHOICE_OR.test(s) && P.CHOICE_FRAME.test(s) && !P.EMPTY_THREATS.test(s);
}

// ---------- the checks ----------

export function statesNotAsks(text: string): CodeCheck {
  const asked = sentences(text).find((s) => {
    const t = s.trim();
    if (!t.endsWith("?")) return false;
    return P.QUESTION_OPENERS.test(t) || P.TAG_QUESTION.test(t);
  });
  // An offered choice ("Do you want to walk or hop?") is not a failure.
  const isChoice = asked ? isChoiceSentence(asked) : false;
  const failed = Boolean(asked) && !isChoice;
  return make(
    "states_not_asks",
    !failed,
    failed ? stripEndPunct(asked!) : null,
    failed
      ? "This is asked as a question, so the child can answer no."
      : "The direction is stated, not asked (offering a choice is fine).",
    true,
  );
}

export function countDirections(text: string): { count: number; directions: string[] } {
  const directions: string[] = [];
  for (const s of sentences(text)) {
    if (isChoiceSentence(s)) {
      // A choice counts as one direction.
      if (P.isImperativeClause(s) || /\?$/.test(s) || /\byou can\b/i.test(s)) directions.push(stripEndPunct(s));
      continue;
    }
    for (const c of clauses(s)) {
      if (P.isImperativeClause(c)) directions.push(stripEndPunct(c));
    }
  }
  return { count: directions.length, directions };
}

export function oneDirection(text: string): CodeCheck {
  const { count, directions } = countDirections(text);
  const failed = count > 1;
  return make(
    "one_direction",
    !failed,
    failed ? directions.slice(0, 2).join(" … ") : null,
    failed
      ? `${count} separate directions. Toddlers remember one thing at a time.`
      : "One direction at a time.",
    true,
  );
}

export function specificAction(text: string): CodeCheck {
  const vague = quote(text, P.VAGUE_DIRECTIONS);
  if (vague) {
    return make("specific_action", false, vague, `"${vague}" doesn't tell the child exactly what to do.`, true);
  }
  const concrete = quote(text, P.CONCRETE_ACTIONS);
  return make(
    "specific_action",
    Boolean(concrete),
    concrete,
    concrete ? "Names a concrete action the child can do." : "No concrete action the child can do yet.",
    false,
  );
}

export function saysWhatToDo(text: string): CodeCheck {
  const negatives: string[] = [];
  let positive = false;
  for (const s of sentences(text)) {
    if (isChoiceSentence(s)) positive = true;
    for (const c of clauses(s)) {
      if (isNegativeImperative(c)) negatives.push(stripEndPunct(c));
      else if (P.isImperativeClause(c)) positive = true;
    }
  }
  if (/\b(you can|let'?s|it'?s time to|time to)\s+\w+/i.test(text)) positive = true;
  const failed = negatives.length > 0 && !positive;
  return make(
    "says_what_to_do",
    !failed,
    failed ? negatives[0] : null,
    failed ? "Only says what to stop. Add what the child should do instead." : "Tells the child what to do.",
    true,
  );
}

const CAPS_ALLOW = new Set(["I", "OK", "TV", "PJ", "PJS", "ABC", "I'M", "I'LL"]);

export function noYelling(text: string): CodeCheck {
  const capsWord = text.match(/\b[A-Z]{2,}(?:'[A-Z]+)?\b/g)?.find((w) => !CAPS_ALLOW.has(w));
  const bangs = (text.match(/!/g) || []).length;
  const repeated = /!{2,}/.test(text);
  let evidence: string | null = null;
  if (capsWord) {
    // Quote the run of capitalized words around the first one.
    evidence = quote(text, new RegExp(`(?:\\b[A-Z']{2,}\\b[\\s,]*)*\\b${capsWord}\\b(?:[\\s,]*\\b[A-Z']{2,}\\b)*!*`)) ?? capsWord;
  } else if (repeated) {
    evidence = quote(text, /[^.!?]*!{2,}/);
  } else if (bangs >= 2) {
    evidence = quote(text, /[^.!?]*!/);
  }
  const failed = Boolean(evidence);
  return make(
    "no_yelling",
    !failed,
    failed ? evidence : null,
    failed ? "Reads as shouting (capitals or several exclamation marks)." : "Calm tone in writing.",
    true,
  );
}

export function noShaming(text: string): CodeCheck {
  const hit = quote(text, P.PHYSICAL_PUNISHMENT);
  if (hit) return make("no_shaming", false, hit, "Physical punishment. The CDC recommends calm consequences instead.", true);
  const insult = quote(text, P.SHAMING);
  if (insult) return make("no_shaming", false, insult, "Insults or shaming hurt and don't teach what to do.", true);
  return make("no_shaming", true, null, "No insults, shaming or physical punishment.", false);
}

export function noEmptyThreats(text: string): CodeCheck {
  const threat = quote(text, P.EMPTY_THREATS);
  return make(
    "no_empty_threats",
    !threat,
    threat,
    threat ? "An empty or outsized threat you wouldn't carry out." : "No empty or outsized threats.",
    true,
  );
}

export function acknowledgesFeeling(text: string): CodeCheck {
  const q = quote(text, P.FEELING_PHRASES);
  return make(
    "acknowledges_feeling",
    Boolean(q),
    q,
    q ? "Names the child's feeling or wish." : "Doesn't name what the child feels or wants.",
    Boolean(q), // a clear match is definite; otherwise the model may still find one
  );
}

export function statesLimit(text: string): CodeCheck {
  const q = quote(text, P.LIMIT_PHRASES);
  return make(
    "states_limit",
    Boolean(q),
    q,
    q ? "States the limit or what happens now." : "The limit itself isn't stated calmly (e.g. \"It's time to go\").",
    false,
  );
}

export function noBribe(text: string): CodeCheck {
  const q = quote(text, P.BRIBE) ?? quote(text, P.BACKING_DOWN);
  return make(
    "no_bribe",
    !q,
    q,
    q ? "A bribe or backing down teaches that resisting works." : "No bribe and no backing down.",
    Boolean(q),
  );
}

export function warningIsCalm(text: string): CodeCheck {
  const warning = quote(text, P.WARNING);
  if (!warning) return make("warning_is_calm", true, null, "No warning used, which is fine.", false);
  const threat = P.EMPTY_THREATS.test(warning) || P.PHYSICAL_PUNISHMENT.test(warning);
  const shouted = /\b[A-Z]{3,}\b/.test(warning) || /!{2,}/.test(warning);
  if (threat || shouted) {
    return make("warning_is_calm", false, warning, "The warning isn't calm or isn't something you'd really do.", true);
  }
  const hasConsequence = /\b(we will|we'?ll|i will|i'?ll|then|you will|you'?ll|we are going to|we'?re going to)\b/i.test(warning);
  return make(
    "warning_is_calm",
    hasConsequence,
    warning,
    hasConsequence ? "A calm if, then warning you can follow through on." : "The warning doesn't say what will happen.",
    false,
  );
}

export function twoOkChoices(text: string): CodeCheck {
  const s = sentences(text).find(isChoiceSentence);
  if (!s) return make("two_ok_choices", false, null, "No choice offered. Two options give a toddler some control.", true);
  return make("two_ok_choices", true, stripEndPunct(s), "Offers two choices.", false);
}

export function alternativeOrPraise(text: string): CodeCheck {
  const q = quote(text, P.ALTERNATIVE_OR_PRAISE);
  return make(
    "alternative_or_praise",
    Boolean(q),
    q,
    q ? "Gives something to do instead, or specific praise." : "No alternative action or specific praise.",
    false,
  );
}

export function runCodeChecks(text: string): CodeCheck[] {
  return [
    statesNotAsks(text),
    oneDirection(text),
    specificAction(text),
    saysWhatToDo(text),
    noYelling(text),
    noShaming(text),
    noEmptyThreats(text),
    acknowledgesFeeling(text),
    statesLimit(text),
    noBribe(text),
    warningIsCalm(text),
    twoOkChoices(text),
    alternativeOrPraise(text),
  ];
}
