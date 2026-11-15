"use client";

import { useState } from "react";
import { DEFAULT_PLAN, GUARANTEE, TEST_CARD, type PlanId } from "@/lib/pricing";
import { PlanOptions, planButtonLabel, planTerms } from "./PlanOptions";
import { update } from "@/lib/storage";
import { Spinner } from "./ui";

/** The three plans, 4 weeks preselected, with exact renewal terms. Used by the in-practice paywall. */
export function PlanPicker({ onUnlocked }: { onUnlocked?: () => void }) {
  const [plan, setPlan] = useState<PlanId>(DEFAULT_PLAN);
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
          s.plus = { since: new Date().toISOString(), plan, demo: true };
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
      <PlanOptions plan={plan} onChange={setPlan} name="paywall-plan" />
      <button type="button" className="btn-primary mt-1 h-14 text-lg" onClick={checkout} disabled={busy}>
        {busy ? <Spinner /> : planButtonLabel(plan)}
      </button>
      <p className="-mt-1 text-center text-[14px] font-semibold">{planTerms(plan)}</p>
      <p className="text-center text-[13px] text-soft-ink">
        <b className="text-ink">{GUARANTEE}.</b> Cancel anytime. Test mode: card <code className="font-mono">{TEST_CARD}</code>.
      </p>
      {msg && <p className="rounded-xl bg-peach px-4 py-2.5 text-sm">{msg}</p>}
    </div>
  );
}
