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
  group: LessonGroup;
};

export type LessonGroup = "basics" | "words" | "hard";
export const LESSON_GROUPS: { id: LessonGroup; title: string; hint: string }[] = [
  { id: "basics", title: "The basics", hint: "Four ideas that help in almost every hard moment" },
  { id: "words", title: "Words that work", hint: "Small changes in how you say it" },
  { id: "hard", title: "When it gets hard", hint: "Pushback, warnings and goodbyes" },
];

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
    group: "basics",
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
    group: "basics",
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
    group: "basics",
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
    group: "basics",
  },
  {
    id: "choices",
    focus: "Offer two choices you're happy with, so Sam gets some control.",
    title: "Offer two good choices",
    hook: "A little control means a lot less fighting.",
    minutes: 2,
    points: [
      "Toddlers push back hard when they feel they have no say. A small choice gives them one.",
      "Offer two options, both fine with you. Two is easier for a young child than many.",
      "The choice is about how, not whether: the shirt goes on either way.",
    ],
    say: ["Do you want the red shirt or the blue shirt?", "You can walk to the car or hop like a bunny."],
    avoid: "Choices you won't accept (\"Do you want to get dressed?\") or too many options.",
    cdc: "goodDirections",
    practice: "getting_dressed",
    skill: "positive_guidance",
    group: "words",
  },
  {
    id: "one_step",
    focus: "Give one short direction at a time, then wait for it before the next.",
    title: "One step at a time",
    hook: "A toddler can hold one instruction, not five.",
    minutes: 2,
    points: [
      "Young children can't remember a string of directions. Give one, then the next.",
      "Make each step small and concrete: \"Red blocks in the bin.\"",
      "Notice when the step is done before you give another.",
    ],
    say: ["Red blocks in the bin now.", "Now the blue ones. You can race me."],
    avoid: "\"Pick up your toys, wash your hands and come to dinner!\" all at once.",
    cdc: "goodDirections",
    practice: "cleanup_toys",
    skill: "clear_direction",
    group: "words",
  },
  {
    id: "say_do",
    focus: "Say what Sam can do, not only what to stop.",
    title: "Say what to do, not just \"stop\"",
    hook: "\"Stop throwing\" leaves a gap. Fill it.",
    minutes: 2,
    points: [
      "\"Stop\" and \"don't\" tell a child what not to do, but not what to do instead.",
      "Name the behavior you want: \"Food stays on the plate.\"",
      "Give an okay way to show the feeling: \"You can say 'no thank you'.\"",
    ],
    say: ["Food stays on the plate.", "You can say 'no thank you' or push the bowl away gently."],
    avoid: "Only \"Stop it!\" or \"Don't do that!\" with nothing after.",
    cdc: "directions",
    practice: "dinner_table",
    skill: "clear_direction",
    group: "words",
  },
  {
    id: "praise",
    focus: "When Sam does part of it, name exactly what was good.",
    title: "Praise the exact thing",
    hook: "\"Good job\" is nice. \"You opened wide!\" teaches.",
    minutes: 2,
    points: [
      "Attention is powerful. Give lots of it to the behavior you want to see again.",
      "Be specific: say exactly what your child did well.",
      "Praise right away, even small steps toward the goal.",
    ],
    say: ["You opened your mouth so wide. Thank you!", "You held the toothbrush all by yourself."],
    avoid: "Only noticing your child when things go wrong.",
    cdc: "responding",
    practice: "brushing_teeth",
    skill: "positive_guidance",
    group: "words",
  },
  {
    id: "warnings",
    focus: "If you give a warning, keep it calm, small and something you will really do.",
    title: "Warnings you'll really follow",
    hook: "A small warning you keep beats a big one you don't.",
    minutes: 2,
    points: [
      "A calm warning tells your child what will happen next, so it isn't a surprise.",
      "Pick a consequence that is small, fair and comes right away.",
      "Then follow through, calmly, every time. That is what makes the next warning work.",
    ],
    say: ["When the show ends, the TV goes off.", "If you throw the remote, it goes up on the shelf."],
    avoid: "\"No TV ever again!\" or warnings you won't carry out.",
    cdc: "consequences",
    practice: "screen_time",
    skill: "boundaries",
    group: "hard",
  },
  {
    id: "calm",
    focus: "Keep your voice low and your words few, even when Sam gets loud.",
    title: "Stay calm when they push",
    hook: "Yelling is attention too, and it can feed the fight.",
    minutes: 2,
    points: [
      "Any attention, even yelling, can make a behavior happen more.",
      "Lower your voice and use fewer words when your child gets louder.",
      "Breathe first. It is okay to pause before you answer.",
    ],
    say: ["I know you're upset about the candy.", "It's time to put it back. You can hold my hand."],
    avoid: "Shouting back, long lectures, or giving in to stop the noise.",
    cdc: "responding",
    practice: "store_candy",
    skill: "calm_respectful",
    group: "hard",
  },
  {
    id: "goodbyes",
    focus: "Name the feeling, say when you'll be back, and keep the goodbye short.",
    title: "Hard goodbyes",
    hook: "Name the sad feeling, then leave with a clear plan.",
    minutes: 2,
    points: [
      "Say what your child feels: \"You're sad when I leave.\"",
      "Tell them when you'll be back in words they know: \"after snack\".",
      "Keep the goodbye short and warm. A long goodbye can make it harder.",
    ],
    say: ["You're sad when I leave.", "I'll pick you up after snack. Hug or high five?"],
    avoid: "Sneaking out, or staying longer each time your child cries.",
    cdc: "timeIn",
    practice: "daycare_dropoff",
    skill: "emotional_response",
    group: "hard",
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
