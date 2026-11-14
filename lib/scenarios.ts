import type { Dimension } from "./rubric/types";

export type ScenarioId = "leaving_playground" | "bedtime_refusal" | "hitting_sibling" | "custom";

/** Short building blocks the code coach uses to repair a parent's own sentence. */
export type CoachLines = { feeling: string; limit: string; choice: string };

export type Variant = {
  lines: CoachLines;
  /** Prewritten replies for this new situation, used when the language model is unavailable. */
  fallbackReplies: { resist: string[]; soften: string[] };
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
  lines: CoachLines;
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
    lines: { feeling: "You wish we could stay.", limit: "It's time to go home now.", choice: "Do you want to walk or hop to the car?" },
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
      fallbackReplies: { resist: ["But I want grandma!", "No shoes! I'm playing!", "I'm not going!"], soften: ["...can grandma come to the car?", "Okay... I put one shoe.", "Can I bring the toy car?"] },
      lines: { feeling: "You love playing at grandma's.", limit: "It's time to go home now.", choice: "Do you want to put on your shoes or should I help?" },
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
    lines: { feeling: "You wish you could keep playing.", limit: "It's bedtime now.", choice: "Do you want one book or two songs?" },
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
      fallbackReplies: { resist: ["Just one more minute!", "No! It's my show!", "I'm not hungry!"], soften: ["...can I watch after dinner?", "Okay... I press it.", "Can it be on pause?"] },
      lines: { feeling: "You really want to see the end of the show.", limit: "It's time to turn it off for dinner.", choice: "Do you want to press the button or should I?" },
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
    lines: { feeling: "You're angry he took your truck.", limit: "I won't let you hit.", choice: "You can stomp your feet or squeeze the pillow." },
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
      fallbackReplies: { resist: ["She had it forever!", "It's MINE now!", "I don't want to share!"], soften: ["...okay, my turn next?", "Can I have the blocks?", "I say sorry?"] },
      lines: { feeling: "You really want a turn with the doll.", limit: "I won't let you push.", choice: "You can ask for a turn or pick another toy." },
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
  // The parent's own moment. The situation text comes from the parent at runtime (describeWith).
  custom: {
    id: "custom",
    lines: { feeling: "I know you're upset.", limit: "It's time to stop now.", choice: "Do you want to do it yourself or should I help?" },
    title: "Your own moment",
    short: "Your moment",
    description: "A hard moment the parent describes.",
    childOpener: "No! I don't want to!",
    scripts: [
      "I know you're upset. It's time to stop now. Do you want to do it yourself or should I help?",
      "You wish you could keep going. It's time to stop now. Do you want to walk or hop to the next thing?",
    ],
    weights: {},
    safetyFirst: false,
    free: true,
    transfer: {
      id: "custom_transfer",
      fallbackReplies: { resist: ["One more slide!", "No! I'm not done!", "I want to stay!"], soften: ["...can I hop like a bunny?", "Okay... hold my hand.", "Can we come back?"] },
      lines: { feeling: "You wish we could stay.", limit: "It's time to go home now.", choice: "Do you want to walk or hop to the car?" },
      title: "Leaving the playground",
      description: "It is time to leave the playground and go home. The child is on the slide and does not want to leave.",
      childOpener: "No! I want to stay on the slide!",
    },
    fallbackReplies: {
      resist: ["No! I don't want to!", "You can't make me!", "NO! Mine!"],
      soften: ["...okay, but I'm sad.", "Can I pick?", "Okay... hold my hand?"],
    },
  },
};

/** The ready-made scenarios (the parent's own moment is offered separately). */
export const SCENARIO_LIST: Scenario[] = Object.values(SCENARIOS).filter((s) => s.id !== "custom");

export const MAX_SITUATION = 220;

/** Cleans a parent-written situation before it goes into a prompt. */
export function cleanSituation(text: string): string {
  return text.replace(/[<>{}]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_SITUATION);
}

export function isScenarioId(v: unknown): v is ScenarioId {
  return typeof v === "string" && v in SCENARIOS;
}

/** Returns the prompt description for a scenario or its transfer variant. */
/** Like describe, but uses the parent's own situation text for "Your moment". */
export function describeWith(id: ScenarioId, transfer: boolean, situation?: string) {
  const d = describe(id, transfer);
  const own = situation ? cleanSituation(situation) : "";
  return id === "custom" && !transfer && own ? { ...d, title: "Your moment", description: `The parent describes it: "${own}"` } : d;
}

export function describe(id: ScenarioId, transfer: boolean): { title: string; description: string; childOpener: string; lines: CoachLines } {
  const s = SCENARIOS[id];
  return transfer
    ? { title: s.transfer.title, description: s.transfer.description, childOpener: s.transfer.childOpener, lines: s.transfer.lines }
    : { title: s.title, description: s.description, childOpener: s.childOpener, lines: s.lines };
}
