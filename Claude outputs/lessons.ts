import { CDC, type CdcKey } from "./rubric/cdc";
import type { ScenarioId } from "./scenarios";
import type { Dimension } from "./rubric/types";

/**
 * Short lessons, each a plain-language summary of one CDC "Essentials for Parenting
 * Toddlers and Preschoolers" topic, followed by the practice moment that trains it.
 * Paraphrased, not copied; every lesson links its CDC page.
 */
export type Lesson = {
  id: string;
  title: string;
  hook: string; // one line on the card
  focus: string; // the one-line focus shown during practice
  minutes: number;
  points: string[]; // 3 key ideas
  say: string[]; // phrases to try
  avoid: string; // one thing to skip
  cdc: CdcKey;
  practice: ScenarioId;
  skill: Dimension;
};

export const LESSONS: Lesson[] = [
  {
    id: "feeling",
    focus: "Name what Sam feels first, then say what happens next.",
    title: "Name the feeling first",
    hook: "An upset toddler can't hear directions yet.",
    minutes: 2,
    points: [
      "When feelings are big, help your child calm before you teach or direct.",
      "Say out loud what they feel or want. It shows you understand, even if the answer is still no.",
      "Then say what happens next, in one short sentence.",
    ],
    say: ["You wish we could stay longer.", "You're sad the slide is over. It's time to go home now."],
    avoid: "Arguing about the feeling (\"Stop crying, it's just a slide\").",
    cdc: "timeIn",
    practice: "leaving_playground",
    skill: "emotional_response",
  },
  {
    id: "directions",
    focus: "Say one clear direction as a statement, and offer two choices.",
    title: "Give one clear direction",
    hook: "Say it, don't ask it. One thing at a time.",
    minutes: 2,
    points: [
      "Say the direction as a statement. \"Can you…?\" or \"Okay?\" invites a no.",
      "Be specific: name the action you want, like \"blocks in the bin\", not \"be good\".",
      "Give one step at a time, and offer two choices you're happy with.",
    ],
    say: ["Blocks go in the bin now.", "Do you want to walk to bed or hop like a bunny?"],
    avoid: "Strings of instructions or vague words like \"behave\".",
    cdc: "goodDirections",
    practice: "bedtime_refusal",
    skill: "clear_direction",
  },
  {
    id: "limits",
    focus: "Say the limit calmly, then hold it. No deals once you have said it.",
    title: "Hold the limit, calmly",
    hook: "Giving in after a tantrum teaches that tantrums work.",
    minutes: 2,
    points: [
      "State the limit plainly: \"It's bedtime now.\" Then follow through.",
      "Use consequences you will really carry out, right after the behavior.",
      "Skip big or empty threats and deals like \"five more minutes\" once you've said no.",
    ],
    say: ["It's bedtime now. I'll help you put the blocks away.", "Blocks are done for today. One book or two songs?"],
    avoid: "\"If you don't stop, no TV ever again!\"",
    cdc: "consequences",
    practice: "bedtime_refusal",
    skill: "boundaries",
  },
  {
    id: "safety",
    focus: "Stop the hitting first (\"I won't let you hit\"), then offer something to do instead.",
    title: "Safety first when it gets physical",
    hook: "Stop the hitting first. Feelings can wait a minute.",
    minutes: 2,
    points: [
      "Keep everyone safe right away: step in and stop the hitting.",
      "Say the limit in a few calm words: \"I won't let you hit.\"",
      "Give something your child can do instead. Talk about feelings once everyone is calm.",
    ],
    say: ["I won't let you hit. Hitting hurts.", "You can stomp your feet or squeeze this pillow."],
    avoid: "Hitting back or shaming (\"Bad boy!\").",
    cdc: "responding",
    practice: "hitting_sibling",
    skill: "boundaries",
  },
];

export function lessonById(id?: string | null): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonSource(l: Lesson) {
  return CDC[l.cdc];
}

/** The lesson to start with, from the skill the quiz (or practice) says to work on first. */
export function lessonForSkill(skill?: Dimension | null): Lesson {
  const id = skill === "clear_direction" || skill === "positive_guidance" ? "directions" : skill === "boundaries" || skill === "calm_respectful" ? "limits" : "feeling";
  return LESSONS.find((l) => l.id === id)!;
}
