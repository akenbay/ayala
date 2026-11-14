// Word and phrase lists used by the deterministic checks.
// All regexes are case-insensitive unless noted.

/** Sentence starts that turn a direction into a question the child can refuse. */
export const QUESTION_OPENERS =
  /^(can|could|would|will|won'?t|do you want|would you like|how about|why don'?t|are you ready|shall we|do you think|please can)\b/i;

/** "..., okay?" or "..., please?" tag questions. */
export const TAG_QUESTION = /,?\s*(ok(ay)?|alright|please|right)\s*\?\s*$/i;

/** Verbs that open an imperative clause ("Go to bed", "Put your shoes on"). */
export const IMPERATIVE_VERBS = [
  "go", "get", "put", "come", "stop", "give", "walk", "sit", "stand", "take", "pick",
  "hold", "brush", "lie", "lay", "climb", "wash", "eat", "turn", "hand", "say", "use",
  "keep", "leave", "quit", "hurry", "listen", "look", "clean", "tidy", "finish", "drop",
  "move", "grab", "bring", "wear", "change", "carry", "hop", "jump", "run", "squeeze",
  "stomp", "breathe", "show", "tell", "ask", "apologize", "share", "help", "follow",
  "close", "open", "shut", "calm", "behave", "settle", "let's", "lets", "don't", "dont",
  "never", "be",
];

const IMPERATIVE_START = new RegExp(
  `^(please\\s+|now\\s+|ok(ay)?,?\\s+|alright,?\\s+|right now,?\\s+)?(${IMPERATIVE_VERBS.join("|")})\\b`,
  "i",
);

/** Noun-phrase directions such as "Shoes on" or "Hands down". */
export const NOUN_DIRECTION =
  /^(your\s+)?(shoes|shoe|coat|jacket|hat|pajamas|pjs|hands?|feet|toys|blocks|tablet|tv|lights?|teeth|seatbelt|socks)\s+(on|off|away|down|in|up|now)\b/i;

export function isImperativeClause(clause: string): boolean {
  const c = clause.trim().replace(/^["'“‘(]+/, "");
  return IMPERATIVE_START.test(c) || NOUN_DIRECTION.test(c);
}

/** Vague directions the CDC names as unclear ("be good", "straighten up"). */
export const VAGUE_DIRECTIONS =
  /\b(be good|be a good (boy|girl)|behave( yourself)?|be nice|act right|straighten up|calm down|knock it off|cut it out|stop it|stop that|enough|listen to me|grow up|be quiet|settle down|act your age|be a big (boy|girl))\b/i;

/** Concrete actions a 2 to 4 year old can do. */
export const CONCRETE_ACTIONS =
  /\b(walk|go (to|home|inside|outside)|get (in|into|on|out|dressed|your)|put (on|your|the|it|them|away)|come (here|with|to|inside|down|over|get)|hold|brush|lie down|lay down|sit (down|on|in|here)|climb|wash|eat|turn (off|it off|the)|hand (me|it)|give (it|me|him|her|the)|pick (one|up|a|the|your)|carry|hop|jump|squeeze|stomp|say ["'“‘]|say (sorry|my turn|please|stop)|use (your|gentle|soft)|take (a|one|turns|your)|clean up|tidy up|bring|wear|choose|drop|shoes on|coat on|pajamas on|pjs on|teeth|seatbelt|blocks? (in|away)|toys away|book|songs?|bed)\b/i;

/** Directions that only say what to stop. */
export const NEGATIVE_DIRECTION = /\b(stop|don'?t|do not|quit|no more|never|no\b(?!\s+more))/i;

/** Insults, shaming and physical punishment. */
export const SHAMING =
  /\b(bad (boy|girl|kid)|naughty|stupid|dumb|brat|crybaby|cry baby|stop being a baby|such a baby|spoiled|lazy|idiot|shut up|ridiculous|embarrass(ing|ed)?|ashamed|what'?s wrong with you|you'?re (so )?(annoying|horrible|terrible|mean|selfish)|i don'?t love you|nobody likes|loser)\b/i;

export const PHYSICAL_PUNISHMENT =
  /\b(spank(ing)?|smack|slap|whoop(ing)?|beat (you|your)|belt|pop (you|your)|swat|hit you|hit your (butt|hand|bottom)|wash your mouth|pinch you)\b/i;

/** Empty or outsized threats. */
export const EMPTY_THREATS =
  /\b(or else|leav(e|ing) you (here|behind|alone)|leave without you|go without you|forever|never (ever )?(again|see|get|go|come|play)|no [a-z' ]{1,24}?ever again|i'?ll tell (daddy|mommy|dad|mom|santa|the police|grandma)|the police|police will|santa (won'?t|isn'?t|will not|is watching)|no (christmas|birthday|presents|toys ever)|monster|throw (all )?(your|the|it|them) .{0,20}(away|in the trash|out)|give (all )?your toys away|i'?ll (take|throw) (all|every)|you'?ll be sorry|i'?m (leaving|going) (now )?without you|get out of my sight)\b/i;

/** Bribes and backing down. */
export const BRIBE =
  /\bif you .{0,60}\b(i'?ll|i will|you'?ll|you will|you can|we'?ll|we will|i'?m going to) (give you|get you|buy you|have|get|let you have|let you watch|let you play)\s+(a |an |some |the |your )?(candy|treat|cookie|cookies|chocolate|ice ?cream|lollipop|sweets?|toy|new toy|present|ipad|tablet|phone|screen|tv|cartoon|show|dessert|snack|gummy|gummies)\b/i;

export const BACKING_DOWN =
  /\b((okay|ok|fine|alright),?\s*(just\s+)?(five|5|one|1|two|2|ten|10|three|3)\s+more\s+(minutes?|mins?|times?|slides?|turns?|shows?|episodes?)|fine,?\s*(you can|stay|whatever|do what you want)|forget it|never ?mind,? (stay|keep)|(let'?s|lets|we can|you can)\s+(play|stay)\b[^.!?]{0,30}\b(an hour|(a )?(few|five|5|ten|10|twenty|20|thirty|30) (more )?(minutes|mins|hours)|a (little|bit) (longer|more)|longer))\b/i;

/** Letting the child keep doing it: "okay go slide", "go ahead and play", "you can keep watching". */
export const GIVE_PERMISSION =
  /\b((okay|ok|fine|alright|sure|yes|yeah)[,.!]?\s*(then\s+)?(go\s+(ahead\s+)?(and\s+)?|you can\s+(go\s+)?(and\s+)?)(slide|play|stay|swing|watch|have (it|the|your)|keep (it|playing|sliding|watching|going))|go (ahead|on),?\s*(and\s+)?(slide|play|stay|swing|watch)|you can keep (playing|sliding|watching|swinging)|(stay|play|slide) as long as you (want|like))\b/i;

/** A warning sentence ("If you..., we will..."). */
export const WARNING = /\b(if you|when you|if he|unless you)\b[^.!?]*/i;

/** Phrases that acknowledge the child's feeling or wish (definite pass). */
export const FEELING_PHRASES =
  /\b(you wish|i know you (want|wish|love|really|don'?t|are|'re|feel|were)|i know it'?s hard|you('re| are) (so |really |feeling )?(sad|mad|angry|upset|frustrated|disappointed|tired|scared|cross|grumpy|having (so much |a lot of )?fun)|you (really )?love|you really want|you (really )?(wanted|didn'?t want|don'?t want to)|it'?s hard to|that'?s hard|that'?s (so )?(frustrating|disappointing)|you feel|you seem|you were having|so much fun|it'?s okay to (be|feel) (sad|mad|angry|upset)|you were (mad|angry|upset|frustrated))\b/i;

/** Statements of the limit or what happens now. */
export const LIMIT_PHRASES =
  /\b(it'?s time (to|for)|it is time|time to (go|leave|get|stop|head)|it'?s bedtime|bedtime now|it is bedtime|(we are|we'?re) (leaving|going) (now|home)|i won'?t let|i will not let|(it'?s|it is) not okay|we don'?t (hit|push|grab)|hitting hurts|(blocks|playtime|the slide|the tablet|tablet|tv|the show|screen time|play time|the park|the playground) (is|are) (done|over|finished|all done)|(is|are) (all )?done for (today|now|tonight)|we (have|need) to (go|leave|get)|no hitting|hands are not for hitting|it'?s time)\b/i;

/** An offered choice with "or" (positive guidance). */
export const CHOICE_OR = /\b\w+[^.!?]{0,60}\bor\b(?!\s+else)[^.!?]{1,60}/i;
export const CHOICE_FRAME = /\b(you can|do you want|would you like|which|choose|pick|you may|want to)\b|\?\s*$/i;

/** An alternative action or specific praise. */
export const ALTERNATIVE_OR_PRAISE =
  /\b(you can (squeeze|stomp|say|use|ask|come|hug|hold|take|jump|hop|pick|choose|play|tell|show|draw|breathe|hit (the|a) pillow|get me)|instead|(hands|feet) are for|try (pushing|saying|using|asking|this)|let'?s (try|count|race|hop|sing)|(thank you|thanks) for|great job|good job|nice job|i love how|i like how|i see you|you did it|well done|way to go|i'?m proud of you for|you (listened|put|walked|used|shared|asked))\b/i;

/** Prompt injection or off-topic input. */
export const INJECTION =
  /\b(ignore (all |any |your |the |previous |prior |these |those )*(instructions|rules|prompt|above)|system prompt|disregard|you are (now )?(an? |the )?(ai|assistant|model|chatbot|language model)|\b(100|full|max(imum)?|perfect) (points|score)|give me .{0,20}points|jailbreak|developer mode|as an ai)\b/i;

/** Small list of very common English words, used to spot gibberish. */
export const COMMON_ENGLISH = new Set(
  (
    ("i you we it he she they me my your our his her the a an to and or but if so now not no yes " +
    "is are was be do does did can will would let lets let's time go come get put on off in out up down " +
    "here there this that what when okay ok please stop dont don't won't wont please bed home car " +
    "shoes hand hands want wish know love fun play more one two minutes again with for of at by from " +
    "all just very really sad mad tired night today tonight after before then first next").split(" ")
  ),
);

export const SPANISH_STOPWORDS =
  /\b(es|hora|de|la|el|los|las|que|vamos|ahora|por|favor|cama|casa|quieres|quiero|mi|amor|tienes|ir|hijo|hija|mira|ya|con|para)\b/gi;

/** Letters from non-Latin scripts (Cyrillic, Greek, CJK, Arabic, Hebrew, etc.). */
export const NON_LATIN = /[Ͱ-ϿЀ-ӿ֐-ۿ぀-ヿ一-鿿가-힯]/;
