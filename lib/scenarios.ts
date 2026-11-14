import type { Dimension } from "./rubric/types";

export type ScenarioId = "leaving_playground" | "bedtime_refusal" | "hitting_sibling";

export type Variant = {
  id: string;
  title: string;
  description: string; // used in prompts
  childOpener: string; // first thing the practice child says
};

export type Scenario = {
  id: ScenarioId;
  title: string;
  short: string;
  description: string; // used in prompts
  childOpener: string;
  scripts: string[]; // curated, written from CDC guidance
  /** 0 removes a dimension from the maximum; the total is rescaled to 100. */
  weights: Partial<Record<Dimension, 0 | 1>>;
  safetyFirst: boolean;
  free: boolean;
  transfer: Variant; // new situation with no script shown
  /** Canned child replies used when the language model is unavailable. */
  fallbackReplies: { resist: string[]; soften: string[] };
};

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  leaving_playground: {
    id: "leaving_playground",
    title: "Leaving the playground is a battle",
    short: "Leaving the playground",
    description:
      "It is time to leave the playground and go home. The child is on the slide and does not want to leave.",
    childOpener: "No! I want to stay on the slide!",
    scripts: [
      "You're having so much fun and you wish we could stay. It's time to go home now. Do you want to walk to the car or hop like a bunny?",
      "I know you love the slide. It's time to leave now. You can do one more slide, then we walk to the car. Do you want to hold my hand or carry your bucket?",
    ],
    weights: {},
    safetyFirst: false,
    free: true,
    transfer: {
      id: "leaving_grandma",
      title: "Leaving grandma's house",
      description:
        "It is time to leave grandma's house and drive home. The child is playing with grandma's toys and refuses to put on their shoes.",
      childOpener: "I don't want to go! I want to stay with grandma!",
    },
    fallbackReplies: {
      resist: ["No! One more time!", "I don't WANT to go home!", "You can't make me!"],
      soften: ["...can I be a bunny?", "Okay... but I'm sad.", "Can I hold your hand?"],
    },
  },
  bedtime_refusal: {
    id: "bedtime_refusal",
    title: "Bedtime turns into a fight",
    short: "Bedtime refusal",
    description:
      "It is bedtime. The child is playing with blocks in the living room and refuses to go to bed.",
    childOpener: "I'm not tired! I want to play more!",
    scripts: [
      "You wish we could keep playing. It's bedtime now. Would you like to walk to bed or hold my hand?",
      "You really love your blocks. Blocks are done for today. Do you want to pick one book or two songs in bed?",
    ],
    weights: {},
    safetyFirst: false,
    free: true,
    transfer: {
      id: "tablet_off",
      title: "Turning off the tablet before dinner",
      description:
        "It is time for dinner. The child is watching a cartoon on the tablet and refuses to turn it off.",
      childOpener: "No! The show isn't over! Five more minutes!",
    },
    fallbackReplies: {
      resist: ["NO! I'm not sleepy!", "Just one more tower!", "I don't like bed!"],
      soften: ["...can I pick the book?", "Okay but carry me.", "Two songs?"],
    },
  },
  hitting_sibling: {
    id: "hitting_sibling",
    title: "Hitting a sibling",
    short: "Hitting a sibling",
    description:
      "The child just hit their baby brother because he grabbed a toy truck. The brother is crying.",
    childOpener: "He took my truck! I hit him because it's MINE!",
    scripts: [
      "I won't let you hit. Hitting hurts. You can squeeze this pillow or stomp your feet.",
      "Stop. I won't let you hit your brother. Hands are for gentle touches. You can say 'my turn' or come get me.",
    ],
    // CDC: safety and the limit come first; emotion coaching comes after calm.
    weights: { emotional_response: 0 },
    safetyFirst: true,
    free: false,
    transfer: {
      id: "grabbing_friend",
      title: "Grabbing a toy from a friend",
      description:
        "At a playdate the child pushes a friend and grabs their doll. The friend is upset.",
      childOpener: "I want the doll! It's my turn!",
    },
    fallbackReplies: {
      resist: ["But it's MINE!", "He's bad! I'll hit him again!", "No! Give it back!"],
      soften: ["...can I stomp?", "Okay... my turn next?", "I squeeze the pillow."],
    },
  },
};

export const SCENARIO_LIST: Scenario[] = Object.values(SCENARIOS);

export function isScenarioId(v: unknown): v is ScenarioId {
  return typeof v === "string" && v in SCENARIOS;
}

/** Returns the prompt description for a scenario or its transfer variant. */
export function describe(id: ScenarioId, transfer: boolean): { title: string; description: string; childOpener: string } {
  const s = SCENARIOS[id];
  return transfer
    ? { title: s.transfer.title, description: s.transfer.description, childOpener: s.transfer.childOpener }
    : { title: s.title, description: s.description, childOpener: s.childOpener };
}
