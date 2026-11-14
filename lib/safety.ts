/**
 * Crisis check on anything the parent types. Code only, so it is instant and repeatable.
 * When it fires, the roleplay stops and the app shows real help lines instead of a score.
 * It aims at the parent's own distress or real harm, not at practice sentences like
 * "I won't let you hit."
 */

const SELF_HARM =
  /\b(kill(ing)? myself|end(ing)? (my|it all|my own) life|suicid\w*|want(ed)? to die|wish i (was|were) dead|don'?t want to (live|be alive|be here anymore)|hurt(ing)? myself|self[- ]?harm|cut(ting)? myself|no reason to live|better off without me|can'?t go on( anymore)?)\b/i;

const HARM_TO_CHILD =
  /\b(i('?m| am)? (going to|gonna|want to|wanna|feel like|could|might|will|almost)\s+(hurt|hit|beat|shake|smack|strangle|choke|kill|throw)\s+(him|her|them|my (son|daughter|baby|kid|child|toddler)|the (baby|kid|child))|shook (my|the) baby|shak(e|ing) (my|the) baby|i (hit|beat|slapped|smacked|choked|shoved) (him|her|my (son|daughter|baby|kid|child|toddler)) (so )?(hard|until|and (he|she) (bled|bruised|stopped))|(he|she|my (son|daughter|baby|kid|child)) (has|had|got) (bruises|marks|a bruise) (from|because of) me)\b/i;

const OVERWHELMED =
  /\b(i can'?t (do this|take (it|this)) anymore|i'?m (not okay|falling apart|breaking down|so depressed|depressed)|i (feel|am) (hopeless|worthless|numb)|postpartum depression|nobody would (care|notice) if i)\b/i;

const UNSAFE_HOME = /\b(he|she|my (husband|wife|partner|boyfriend|girlfriend)) (hits|beats|chokes|threatens) (me|us|the kids|my (son|daughter|kids?))\b/i;

export type Crisis = { kind: "self_harm" | "harm_to_child" | "overwhelmed" | "unsafe_home" };

export function detectCrisis(text: string): Crisis | null {
  if (SELF_HARM.test(text)) return { kind: "self_harm" };
  if (HARM_TO_CHILD.test(text)) return { kind: "harm_to_child" };
  if (UNSAFE_HOME.test(text)) return { kind: "unsafe_home" };
  if (OVERWHELMED.test(text)) return { kind: "overwhelmed" };
  return null;
}

export type HelpLine = { name: string; number: string; href: string; note: string };

export const HELP_LINES: HelpLine[] = [
  { name: "988 Suicide & Crisis Lifeline", number: "Call or text 988", href: "tel:988", note: "24/7, free and confidential" },
  {
    name: "National Maternal Mental Health Hotline",
    number: "1-833-TLC-MAMA (1-833-852-6262)",
    href: "tel:18338526262",
    note: "Call or text, 24/7, for pregnant and new parents",
  },
  {
    name: "Childhelp National Child Abuse Hotline",
    number: "1-800-422-4453",
    href: "tel:18004224453",
    note: "24/7, for parents who fear they may hurt a child, too",
  },
  {
    name: "National Domestic Violence Hotline",
    number: "1-800-799-7233",
    href: "tel:18007997233",
    note: "24/7, or text START to 88788",
  },
];

/** Which lines to show first for each kind of crisis. */
export function helpFor(kind: Crisis["kind"]): HelpLine[] {
  const order: Record<Crisis["kind"], number[]> = {
    self_harm: [0, 1],
    overwhelmed: [1, 0],
    harm_to_child: [2, 0, 1],
    unsafe_home: [3, 0],
  };
  return order[kind].map((i) => HELP_LINES[i]);
}
