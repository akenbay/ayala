"use client";

import { PLANS, PLAN_ORDER, termsLine, type PlanId } from "@/lib/pricing";

/** The three Plus plans as radio cards, each with its exact first payment and renewal price. */
export function PlanOptions({ plan, onChange, name }: { plan: PlanId; onChange: (p: PlanId) => void; name: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {PLAN_ORDER.map((id) => {
        const p = PLANS[id];
        const on = plan === id;
        return (
          <label
            key={id}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 ${on ? "border-ink bg-white shadow-[0_0_0_1px_#1C1608]" : "border-field bg-cream"}`}
          >
            <input type="radio" name={name} value={id} checked={on} onChange={() => onChange(id)} className="h-5 w-5 shrink-0 accent-black" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[17px] font-extrabold">{p.title}</span>
                {p.badge && <span className="rounded-full bg-orange px-2.5 py-0.5 text-xs font-extrabold">{p.badge}</span>}
              </span>
              <span className="block text-[13px] text-muted">Then {p.renewLabel}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-lg font-extrabold">{p.firstLabel}</span>
              <span className="block text-xs text-muted">{p.trialDays ? "for 7 days" : `for ${p.firstPeriod}`}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** The exact terms of the selected plan, shown on and under the pay button. */
export function planButtonLabel(id: PlanId): string {
  return `Get Plus: ${PLANS[id].firstLabel} ${PLANS[id].trialDays ? "for 7 days" : "today"}`;
}

export function planTerms(id: PlanId): string {
  return `${termsLine(PLANS[id])}, until you cancel.`;
}
