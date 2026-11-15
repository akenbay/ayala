/**
 * Plus plans, Zimran style: a cheaper first period, then a clear renewal price.
 * The renewal price is always shown next to the button, and a 14 day money back guarantee applies.
 */
export type PlanId = "trial" | "four_week" | "twelve_week";

export type Plan = {
  id: PlanId;
  title: string;
  badge?: string;
  /** First payment, in cents, and what it covers. */
  firstCents: number;
  firstLabel: string;
  firstPeriod: string;
  /** For the trial: days before the first renewal. Otherwise the first period equals one renewal period. */
  trialDays?: number;
  /** Renewal price, in cents, charged every `renewWeeks` weeks. */
  renewCents: number;
  renewWeeks: 4 | 12;
  renewLabel: string;
  /** Renewal price expressed per month, for comparisons. */
  perMonth: string;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function plan(p: Omit<Plan, "firstLabel" | "renewLabel" | "perMonth">): Plan {
  return {
    ...p,
    firstLabel: money(p.firstCents),
    renewLabel: `${money(p.renewCents)} every ${p.renewWeeks} weeks`,
    perMonth: money(Math.round((p.renewCents * 52) / p.renewWeeks / 12)),
  };
}

export const PLANS: Record<PlanId, Plan> = {
  trial: plan({ id: "trial", title: "7-day trial", firstCents: 499, firstPeriod: "7 days", trialDays: 7, renewCents: 1999, renewWeeks: 4 }),
  four_week: plan({ id: "four_week", title: "4 weeks", badge: "Popular", firstCents: 1499, firstPeriod: "4 weeks", renewCents: 1999, renewWeeks: 4 }),
  twelve_week: plan({ id: "twelve_week", title: "12 weeks", badge: "Best value", firstCents: 2999, firstPeriod: "12 weeks", renewCents: 3999, renewWeeks: 12 }),
};

export const PLAN_ORDER: PlanId[] = ["trial", "four_week", "twelve_week"];
export const DEFAULT_PLAN: PlanId = "four_week";

export function isPlanId(v: unknown): v is PlanId {
  return v === "trial" || v === "four_week" || v === "twelve_week";
}

/** "$14.99 today, then $19.99 every 4 weeks" */
export function termsLine(p: Plan): string {
  return `${p.firstLabel} ${p.trialDays ? `for ${p.firstPeriod}` : "today"}, then ${p.renewLabel}`;
}

/** Days from purchase to the first renewal, then between renewals. */
export function renewalDays(id: PlanId): { first: number; every: number } {
  const p = PLANS[id];
  return { first: p.trialDays ?? p.renewWeeks * 7, every: p.renewWeeks * 7 };
}

export const LOWEST_PER_MONTH = PLANS.twelve_week.perMonth;
export const GUARANTEE = "14 day money back guarantee";
export const TEST_CARD = "4242 4242 4242 4242";
