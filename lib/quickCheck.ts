import type { CdcKey } from "./rubric/cdc";
import type { Dimension } from "./rubric/types";
import { buildScorecard } from "./rubric/score";

/**
 * The quiz's quick check: one playground moment, three answers, scored by the same code rubric as practice.
 * It lets a parent feel the scoring before any plan or price, and refines the first focus skill.
 */
export type CheckId = "a" | "b" | "c";

export const CHECK_OPENER = "No! I want to stay on the slide!";

export const CHECK_OPTIONS: { id: CheckId; text: string; why: string; cdc: CdcKey; focus: Dimension | null }[] = [
  {
    id: "a",
    text: "Let's go home, okay?",
    why: "\"Okay?\" turns it into a question, so \"no\" is a fair answer. Say the direction as a statement.",
    cdc: "goodDirections",
    focus: "clear_direction",
  },
  {
    id: "b",
    text: "You wish you could stay. It's time to go now. Walk to the car or hop like a bunny?",
    why: "You named the feeling, said the limit calmly and offered two choices you're happy with.",
    cdc: "directions",
    focus: null,
  },
  {
    id: "c",
    text: "If you don't come now, we're never coming back here!",
    why: "A big threat you won't really carry out. Next time it won't work, and it scares more than it teaches.",
    cdc: "consequences",
    focus: "calm_respectful",
  },
];

/** The real rubric score for an answer (code checks only, so it is instant and always the same). */
export function checkScore(id: CheckId): number {
  const o = CHECK_OPTIONS.find((x) => x.id === id)!;
  return buildScorecard(o.text, "leaving_playground", null, true).total;
}
