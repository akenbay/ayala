/**
 * CDC pages the rubric and the coach are based on ("Essentials for Parenting Toddlers and Preschoolers").
 * Shown in the UI next to each check. Federal government content, public domain.
 */
export const CDC = {
  directions: {
    name: "CDC: Tips for Giving Directions",
    url: "https://www.cdc.gov/parenting-toddlers/communication/giving-directions.html",
  },
  goodDirections: {
    name: "CDC: Steps for Giving Good Directions",
    url: "https://www.cdc.gov/parenting-toddlers/directions/good-directions.html",
  },
  timeIn: {
    name: "CDC: How to Use Time-In",
    url: "https://www.cdc.gov/parenting-toddlers/responding-to-behavior/time-in.html",
  },
  consequences: {
    name: "CDC: Tips for Using Consequences",
    url: "https://www.cdc.gov/parenting-toddlers/discipline-consequences/consequences.html",
  },
  responding: {
    name: "CDC: Tips for Responding to Behavior",
    url: "https://www.cdc.gov/parenting-toddlers/responding-to-behavior/index.html",
  },
  essentials: {
    name: "CDC: Essentials for Parenting Toddlers",
    url: "https://www.cdc.gov/parenting-toddlers/site.html",
  },
} as const;

export type CdcKey = keyof typeof CDC;

/**
 * The short playbook the AI coach must ground its advice in. Each rule is a paraphrase of the
 * CDC page it names; the coach cites the page, the app links it.
 */
export const PLAYBOOK: { rule: string; page: CdcKey }[] = [
  { rule: "Give one clear direction at a time, said as a statement, not a question.", page: "goodDirections" },
  { rule: "Be specific: name the action you want (\"shoes on\"), not vague words like \"be good\".", page: "goodDirections" },
  { rule: "Say what to do instead, not only what to stop.", page: "directions" },
  { rule: "Offer two choices you are happy with, so the child has some control.", page: "goodDirections" },
  { rule: "When a child is upset, name the feeling and help them calm first (time-in, emotion coaching).", page: "timeIn" },
  { rule: "Stay calm. Attention, even negative attention like yelling, can reinforce behavior.", page: "responding" },
  { rule: "Praise the specific behavior you want to see more of.", page: "responding" },
  { rule: "Use consequences that come right after the behavior and that you will really follow through on. No big or empty threats.", page: "consequences" },
  { rule: "Hold the limit: giving in after a tantrum teaches that tantrums work.", page: "consequences" },
];
