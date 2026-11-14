export type PlanId = "monthly" | "annual";

export const PLANS: Record<PlanId, { id: PlanId; cents: number; interval: "month" | "year"; label: string; perMonth: string; note: string }> = {
  annual: { id: "annual", cents: 7900, interval: "year", label: "$79/year", perMonth: "$6.58/month", note: "Billed once a year. Save 49%." },
  monthly: { id: "monthly", cents: 1299, interval: "month", label: "$12.99/month", perMonth: "$12.99/month", note: "Billed monthly. Cancel anytime." },
};

export function isPlanId(v: unknown): v is PlanId {
  return v === "monthly" || v === "annual";
}

export const PRICE_CENTS = PLANS.monthly.cents;
export const PRICE_LABEL = PLANS.monthly.label;
export const GUARANTEE = "14 day money back guarantee";
export const TEST_CARD = "4242 4242 4242 4242";
