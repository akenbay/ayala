"use client";

import type { CheckResult, Dimension, Scorecard } from "@/lib/rubric/types";
import { type SamState } from "@/lib/toddler";

export const STRENGTH: Record<Dimension, string> = {
  clear_direction: "clear",
  calm_respectful: "calm",
  emotional_response: "warm",
  boundaries: "firm",
  positive_guidance: "positive",
};
export const NEXT: Record<Dimension, string> = {
  clear_direction: "Try one short direction.",
  calm_respectful: "Try a calmer tone.",
  emotional_response: "Try naming the feeling.",
  boundaries: "Try stating the limit.",
  positive_guidance: "Try offering two choices.",
};

export function biggestMiss(card: Scorecard): CheckResult | null {
  const failed = card.checks.filter((c) => !c.passed && c.maxPoints > 0);
  return failed.sort((a, b) => b.maxPoints - b.points - (a.maxPoints - a.points))[0] ?? null;
}

/** One sentence: what went well, then the single next thing to try. Built from the real checks. */
export function verdict(card: Scorecard): string {
  const strengths = (Object.keys(STRENGTH) as Dimension[])
    .filter((d) => card.byDimension[d].max > 0 && card.byDimension[d].earned / card.byDimension[d].max >= 0.75)
    .slice(0, 2)
    .map((d) => STRENGTH[d]);
  const miss = biggestMiss(card);
  const head = strengths.length ? strengths.join(" and ") : "";
  const first = card.total < 55 ? "A first try." : head ? head[0].toUpperCase() + head.slice(1) + "." : "A good start.";
  return miss ? `${first} ${NEXT[miss.dimension]}` : `${first} Every check passed.`;
}

export type Msg = { role: "child" | "parent"; text: string; card?: Scorecard; state?: SamState; setup?: boolean };
export type Step = "chat" | "score" | "compare" | "paywall" | "done";

export const STATE_DOT: Record<SamState, string> = {
  going_along: "bg-good-line",
  resisting: "bg-orange",
  meltdown: "bg-red",
  gave_in: "bg-muted",
};

export const OUTCOME: Record<SamState, { title: string; text: string; tone: string }> = {
  going_along: { title: "You did it. Sam is coming along.", text: "Your words calmed the moment. See which ones worked.", tone: "bg-good-soft" },
  meltdown: { title: "Sam melted down.", text: "That happens, even to great parents. Let's see what to change.", tone: "bg-bad-soft" },
  gave_in: { title: "Sam got their way.", text: "Sam is happy for now, but the limit moved, so this moment will come back.", tone: "bg-peach" },
  resisting: { title: "Sam is still upset.", text: "Real moments can take a while. Let's see what would help most.", tone: "bg-peach" },
};
