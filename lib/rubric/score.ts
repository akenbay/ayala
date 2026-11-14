import { SCENARIOS, type ScenarioId } from "../scenarios";
import { ABSENCE_CHECKS, CONSTRUCTIVE_CHECKS, runCodeChecks, sentences, type CodeCheck } from "./codeChecks";
import { INJECTION } from "./patterns";
import { DIMENSIONS, type CheckResult, type Dimension, type LlmVerdict, type Scorecard } from "./types";

/** Checks the language model is allowed to decide when the code is not certain. */
export const LLM_CHECK_IDS = [
  "specific_action",
  "acknowledges_feeling",
  "states_limit",
  "warning_is_calm",
  "no_shaming",
  "two_ok_choices",
  "alternative_or_praise",
] as const;

/**
 * Merges model verdicts into the code checks.
 * Rules: code wins when it is definite; a verdict whose quote is not an exact
 * substring of the parent's text is discarded; passes need a quote.
 */
export function mergeVerdicts(text: string, checks: CodeCheck[], verdicts: LlmVerdict[] | null): CheckResult[] {
  const byId = new Map((verdicts ?? []).map((v) => [v.id, v]));
  return checks.map(({ definite, ...c }) => {
    const v = byId.get(c.id);
    if (definite || !v || !(LLM_CHECK_IDS as readonly string[]).includes(c.id)) return c;
    const q = v.quote && text.includes(v.quote) ? v.quote : null;
    if (v.quote && !q) return c; // quote not found in the text: discard the verdict
    // A pass on a "reward" check must be backed by a quote; a pass on an absence check needs none.
    const needsQuote = c.id !== "no_shaming" && c.id !== "warning_is_calm";
    if (v.passed && needsQuote && !q) return c;
    if (!v.passed && c.id === "no_shaming" && !q) return c;
    return {
      ...c,
      passed: v.passed,
      points: v.passed ? c.maxPoints : 0,
      evidence: q,
      explanation: v.reason?.trim() ? v.reason.trim().slice(0, 200) : c.explanation,
      source: "llm" as const,
    };
  });
}

export function textStats(text: string) {
  const words = (text.match(/[A-Za-z']+/g) ?? []).length;
  const ss = sentences(text);
  const avg = ss.length ? Math.round((words / ss.length) * 10) / 10 : words;
  return { words, avgSentenceLength: avg, longHint: words > 30 || avg > 12 };
}

export function isInjection(text: string): boolean {
  return INJECTION.test(text);
}

/**
 * Builds the scorecard. Pure and deterministic for a given text and set of verdicts.
 */
export function buildScorecard(
  text: string,
  scenarioId: ScenarioId,
  verdicts: LlmVerdict[] | null,
  degraded: boolean,
): Scorecard {
  const scenario = SCENARIOS[scenarioId];
  const notes: string[] = [];
  let checks = mergeVerdicts(text, runCodeChecks(text), verdicts);

  // Half credit for "nothing bad happened" checks when nothing constructive was said.
  const constructive = checks.some((c) => CONSTRUCTIVE_CHECKS.includes(c.id) && c.passed);
  if (!constructive) {
    checks = checks.map((c) =>
      ABSENCE_CHECKS.includes(c.id) && c.passed ? { ...c, points: Math.floor(c.maxPoints / 2) } : c,
    );
    notes.push("Nothing to build on yet: add a clear direction, the limit, or name the feeling.");
  }

  // Safety-first scenarios: emotion coaching comes after calm, so it is not scored.
  const weight = (d: Dimension) => (scenario.weights[d] === 0 ? 0 : 1);
  if (scenario.safetyFirst) notes.push("Safety first: here the limit matters most. Naming the feeling can wait until everyone is calm, so it isn't scored.");

  const byDimension = Object.fromEntries(DIMENSIONS.map((d) => [d, { earned: 0, max: 0 }])) as Scorecard["byDimension"];
  for (const c of checks) {
    if (!weight(c.dimension)) continue;
    byDimension[c.dimension].earned += c.points;
    byDimension[c.dimension].max += c.maxPoints;
  }
  const earned = DIMENSIONS.reduce((s, d) => s + byDimension[d].earned, 0);
  const max = DIMENSIONS.reduce((s, d) => s + byDimension[d].max, 0);
  let total = max ? Math.round((earned / max) * 100) : 0;

  if (isInjection(text)) {
    total = Math.min(total, 10);
    notes.unshift("This doesn't look like something you'd say to a child, so it isn't scored.");
  }

  if (checks.some((c) => c.id === "no_shaming" && !c.passed)) {
    notes.push("Hard moments happen to every parent. Take a breath. The next attempt is a fresh start.");
  }

  const stats = textStats(text);
  if (stats.longHint) notes.push("That's a lot of words for a toddler. Try short sentences, under 12 words each.");

  return { total, byDimension, checks: checks.filter((c) => weight(c.dimension)), degraded, notes, stats };
}
