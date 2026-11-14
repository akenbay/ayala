/** CDC pages the rubric is based on. Shown in the UI next to each check. */
export const CDC = {
  directions: {
    name: "CDC: Tips for Giving Directions",
    url: "https://www.cdc.gov/parenting-toddlers/communication/giving-directions.html",
  },
  goodDirections: {
    name: "CDC: Steps for Giving Good Directions",
    url: "https://www.cdc.gov/parenting-toddlers/directions/good-directions.html",
  },
  oneAtATime: {
    name: "CDC: Answers from Experts (one direction at a time)",
    url: "https://www.cdc.gov/parents/essentials/toddlersandpreschoolers/directions/answersfromexperts.html",
  },
  essentials: {
    name: "CDC: Essentials for Parenting Toddlers",
    url: "https://www.cdc.gov/parenting-toddlers/site.html",
  },
} as const;

export type CdcKey = keyof typeof CDC;
