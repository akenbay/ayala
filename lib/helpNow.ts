import type { CdcKey } from "./rubric/cdc";
import type { ScenarioId } from "./scenarios";

/**
 * "Help me now": one short script for a hard moment that is happening right now.
 * No chat, no score, no network. Written from the same CDC guidance as the rubric:
 * name the feeling, state one clear limit, offer two acceptable choices, stay calm.
 */
export type HelpScript = {
  id: string;
  label: string; // button text
  say: string[]; // say these, in order
  ifMore: string; // if the child keeps going
  avoid: string;
  cdc: CdcKey;
  /** The built-in moment this script practices, or "custom" with a situation for Your own moment. */
  practice: ScenarioId;
  situation: string; // used to start "Practice this for next time"
  keywords: string[];
};

export const HELP_SCRIPTS: HelpScript[] = [
  {
    id: "leaving",
    label: "Won't leave",
    say: ["You wish we could stay longer.", "It's time to go now.", "Do you want to walk to the car or hop like a bunny?"],
    ifMore: "Stay calm and repeat it once: \"It's time to go. I'll help you walk.\" Then calmly help.",
    avoid: "Bargaining for \"five more minutes\" again and again.",
    cdc: "directions",
    practice: "leaving_playground",
    situation: "My child refuses to leave the playground.",
    keywords: ["leave", "leaving", "park", "playground", "go home", "slide", "store", "grandma"],
  },
  {
    id: "bedtime",
    label: "Bedtime fight",
    say: ["You wish you could keep playing.", "It's bedtime now.", "Do you want one book or two songs in bed?"],
    ifMore: "Keep your voice low: \"Toys are done for today. I'll carry you or you can walk.\"",
    avoid: "Long explanations about why sleep matters.",
    cdc: "directions",
    practice: "bedtime_refusal",
    situation: "My child refuses to go to bed and keeps playing.",
    keywords: ["bed", "bedtime", "sleep", "night", "pajamas", "nap"],
  },
  {
    id: "screens",
    label: "Screen off",
    say: ["You really want to see the end of the show.", "It's time to turn it off now.", "Do you want to press the button or should I?"],
    ifMore: "Turn it off calmly: \"The show is done. You can be sad. Let's pick a song for dinner.\"",
    avoid: "Threats like \"no TV ever again\".",
    cdc: "consequences",
    practice: "custom",
    situation: "My child screams when I turn off the tablet before dinner.",
    keywords: ["tv", "tablet", "screen", "show", "ipad", "phone", "cartoon", "video"],
  },
  {
    id: "hitting",
    label: "Hitting",
    say: ["Stop. I won't let you hit.", "Hitting hurts.", "You can stomp your feet or squeeze this pillow."],
    ifMore: "Move them gently apart and stay close: \"I'll keep everyone safe. We'll talk when your body is calm.\"",
    avoid: "Hitting back or yelling. Talk about feelings after everyone is calm.",
    cdc: "responding",
    practice: "hitting_sibling",
    situation: "My child just hit their sibling.",
    keywords: ["hit", "hitting", "bite", "biting", "kick", "push", "brother", "sister", "sibling", "hurt"],
  },
  {
    id: "dressing",
    label: "Won't get dressed",
    say: ["You don't want to stop playing.", "It's time to put on your shoes now.", "Do you want the red shoes or the blue shoes?"],
    ifMore: "Give one step at a time: \"First this foot. I'll help with the other one.\"",
    avoid: "Five directions at once: \"Shoes, coat, bag, hurry up!\"",
    cdc: "goodDirections",
    practice: "custom",
    situation: "My child won't put on shoes and a coat when we need to leave in the morning.",
    keywords: ["dress", "dressed", "shoes", "coat", "clothes", "morning", "jacket", "socks"],
  },
  {
    id: "carseat",
    label: "Car seat",
    say: ["You're mad about the car seat.", "It's time to buckle in now. It keeps your body safe.", "Do you want to climb in or should I lift you?"],
    ifMore: "Stay calm and buckle: \"I'll do it now. You can hold your bunny.\"",
    avoid: "Driving off without buckling, or promising a treat to sit down.",
    cdc: "consequences",
    practice: "custom",
    situation: "My child arches their back and won't get in the car seat.",
    keywords: ["car", "seat", "carseat", "buckle", "stroller"],
  },
  {
    id: "public",
    label: "Meltdown in public",
    say: ["You're really upset. You wanted the candy.", "The answer is no today.", "You can hold my hand or ride in the cart."],
    ifMore: "Move somewhere quieter and wait: \"I'm right here. We'll go when you're calm.\"",
    avoid: "Giving in to stop the noise. It teaches that screaming works.",
    cdc: "timeIn",
    practice: "custom",
    situation: "At the store my child grabs candy and screams on the floor when I say no.",
    keywords: ["store", "shop", "candy", "public", "floor", "scream", "cart", "toy", "mall", "restaurant"],
  },
  {
    id: "meltdown",
    label: "Big meltdown",
    say: ["You're really upset.", "I'm right here. I'll stay with you.", "When your body is calm, we'll fix it together."],
    ifMore: "Say less, not more. Keep everyone safe and wait for the calm before you teach.",
    avoid: "Reasoning or lecturing while the feelings are big.",
    cdc: "timeIn",
    practice: "custom",
    situation: "My child has a huge meltdown, screaming and crying, and I don't know what to say.",
    keywords: ["meltdown", "tantrum", "cry", "crying", "screaming", "upset", "losing it"],
  },
];

/** For after yelling: reconnect and own the mistake, without shame. */
export const REPAIR_SCRIPT: HelpScript = {
  id: "repair",
  label: "I yelled",
  say: ["I'm sorry I yelled. That was too loud.", "You were upset and I got upset too.", "I love you. Let's try again together."],
  ifMore: "Repair works best when it's short. A hug or sitting close says the rest.",
  avoid: "Blaming the child (\"You made me yell\"). Every parent yells sometimes; repair is what matters.",
  cdc: "essentials",
  practice: "custom",
  situation: "I lost my temper and yelled at my child.",
  keywords: ["yelled", "shouted", "lost it", "lost my temper", "screamed at"],
};

/** Picks the script whose keywords best match what the parent typed. */
export function matchScript(text: string): HelpScript {
  const t = ` ${text.toLowerCase()} `;
  let best = HELP_SCRIPTS[HELP_SCRIPTS.length - 1];
  let bestHits = 0;
  for (const s of [...HELP_SCRIPTS, REPAIR_SCRIPT]) {
    const hits = s.keywords.filter((k) => t.includes(k)).length;
    if (hits > bestHits) {
      best = s;
      bestHits = hits;
    }
  }
  return best;
}

export function scriptById(id: string | null | undefined): HelpScript | undefined {
  return [...HELP_SCRIPTS, REPAIR_SCRIPT].find((s) => s.id === id);
}
