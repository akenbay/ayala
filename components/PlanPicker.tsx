"use client";

import { useState } from "react";
import { GUARANTEE, PLANS, TEST_CARD, type PlanId } from "@/lib/pricing";
import { update } from "@/lib/storage";
import { Spinner } from "./ui";

const RENEWS: Record<PlanId, string> = {
  annual: "$79 today, then $79 every year until you cancel.",
  monthly: "$12.99 today, then $12.99 every month until you cancel.",
};

/** The two plans, yearly preselected, with exact renewal terms. Shared by the in-practice paywall. */
export function PlanPicker({ onUnlocked }: { onUnlocked?: () => void }) {
  const [plan, setPlan] = useState<PlanId>("annual");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function checkout() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const d = await r.json();
      if (d.url) {
        window.location.href = d.url;
        return;
      }
      if (d.demo) {
        update((s) => {
          s.unlocked = true;
        });
        setMsg("Stripe isn't configured on this server, so Plus was unlocked in demo mode.");
        onUnlocked?.();
      } else setMsg(d.error ?? "Checkout is unavailable right now.");
    } catch {
      setMsg("Connection problem. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2.5">
      {(["annual", "monthly"] as PlanId[]).map((id) => {
        const p = PLANS[id];
        const on = plan === id;
        return (
          <label
            key={id}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 ${on ? "border-ink bg-white shadow-[0_0_0_1px_#1C1608]" : "border-field bg-cream"}`}
          >
            <input type="radio" name="paywall-plan" value={id} checked={on} onChange={() => setPlan(id)} className="h-5 w-5 accent-black" />
            <span className="flex-1">
              <span className="flex items-center gap-2">
                <span className="text-[17px] font-extrabold">{id === "annual" ? "Yearly" : "Monthly"}</span>
                {id === "annual" && <span className="rounded-full bg-orange px-2.5 py-0.5 text-xs font-extrabold">Save 49%</span>}
              </span>
              <span className="block text-[13px] text-muted">{RENEWS[id]}</span>
            </span>
            <span className="text-right">
              <span className="block text-lg font-extrabold">{p.label}</span>
              {id === "annual" && <span className="block text-xs text-muted">{p.perMonth}</span>}
            </span>
          </label>
        );
      })}
      <button type="button" className="btn-primary mt-1 h-14 text-lg" onClick={checkout} disabled={busy}>
        {busy ? <Spinner /> : `Continue with ${PLANS[plan].label}`}
      </button>
      <p className="text-center text-[13px] text-soft-ink">
        <b className="text-ink">{GUARANTEE}.</b> Cancel anytime. Test mode: card <code className="font-mono">{TEST_CARD}</code>.
      </p>
      {msg && <p className="rounded-xl bg-peach px-4 py-2.5 text-sm">{msg}</p>}
    </div>
  );
}
