"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GUARANTEE, PLANS, TEST_CARD, type PlanId } from "@/lib/pricing";
import { update, useStore } from "@/lib/storage";
import { Spinner } from "@/components/ui";
import { ManagePlus, RestorePlus } from "@/components/ManagePlus";

const FEATURES: [string, string][] = [
  ["Every real moment, as often as it happens", "Unlimited Your own moment and Today I lost it. Practice what actually happened today, not a fixed lesson."],
  ["Your phrase bank, with no limit", "Every improved sentence you save. Your own words show first when you open Help me now."],
  ["New moments as your child grows", "Hitting a sibling today, and every built-in moment we add next (getting dressed, car seat, screens)."],
  ["Prove the skill sticks", "New situations with no tips, your skill trends, and the full plan aimed at your weakest skill."],
];

export default function PricingPage() {
  const unlocked = useStore()?.unlocked ?? false;
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<PlanId>("annual");
  const [msg, setMsg] = useState<{ tone: "good" | "bad" | "info"; text: string } | null>(null);

  // Handle the return from Stripe Checkout once on mount.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const status = q.get("status");
    const sessionId = q.get("session_id");
    if (!status) return;
    window.history.replaceState(null, "", "/pricing");
    (async () => {
      if (status === "cancel") {
        await Promise.resolve();
        setMsg({ tone: "info", text: "Checkout cancelled. Nothing was charged." });
        return;
      }
      if (status !== "success" || !sessionId) return;
      setBusy(true);
      try {
        const r = await fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`);
        const d = (await r.json()) as { unlocked?: boolean; plan?: PlanId };
        if (d.unlocked) {
          update((s) => {
            s.unlocked = true;
            s.plus = { since: new Date().toISOString(), plan: d.plan ?? "monthly", checkoutSessionId: sessionId };
          });
          setMsg({ tone: "good", text: "Welcome to Plus. Everything is unlocked." });
        } else setMsg({ tone: "bad", text: "We couldn't confirm the payment. Try again." });
      } catch {
        setMsg({ tone: "bad", text: "We couldn't confirm the payment. Try again." });
      }
      setBusy(false);
    })();
  }, []);

  async function checkout() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
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
        setMsg({ tone: "info", text: "Stripe isn't configured on this server, so Plus was unlocked in demo mode." });
      } else {
        setMsg({ tone: "bad", text: d.error ?? "Checkout is unavailable right now." });
      }
    } catch {
      setMsg({ tone: "bad", text: "Connection problem. Try again." });
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 py-4">
      <div>
        <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-cream">Plus</span>
        <h1 className="font-display mt-3 text-[32px] leading-tight">Ready for the next hard moment, whatever it is</h1>
        <p className="mt-2 text-muted">
          Help me now stays free for everyone. Plus lets you practice every real moment as it happens, keeps all your best words, and grows with your child.
          No daily streaks, no guilt.
        </p>
      </div>

      {msg && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            msg.tone === "good" ? "bg-good-soft text-good" : msg.tone === "bad" ? "bg-bad-soft text-bad" : "bg-peach text-ink"
          }`}
        >
          {msg.text}
        </p>
      )}

      <ManagePlus />

      <div className="card shadow-[inset_0_0_0_2px_#1C1608]">
        <fieldset>
          <legend className="text-sm font-semibold text-muted">Choose your plan</legend>
          <div className="mt-2 grid gap-2.5">
            {(["annual", "monthly"] as PlanId[]).map((id) => {
              const p = PLANS[id];
              const on = plan === id;
              return (
                <label
                  key={id}
                  className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 ${on ? "border-ink bg-white shadow-[0_0_0_1px_#1C1608]" : "border-field bg-cream"}`}
                >
                  <input type="radio" name="plan" value={id} checked={on} onChange={() => setPlan(id)} className="h-5 w-5 accent-black" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[17px] font-extrabold">{id === "annual" ? "Yearly" : "Monthly"}</span>
                      {id === "annual" && <span className="rounded-full bg-orange px-2.5 py-0.5 text-xs font-extrabold">Best value</span>}
                    </span>
                    <span className="block text-sm text-muted">{p.note}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-lg font-extrabold">{p.label}</span>
                    {id === "annual" && <span className="block text-xs text-muted">{p.perMonth}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <ul className="mt-4 space-y-3">
          {FEATURES.map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <span className="mt-0.5 text-good">✓</span>
              <span>
                <b>{t}</b>
                <span className="block text-sm text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ul>
        {unlocked ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/help" className="btn-primary">
              Help me now
            </Link>
            <Link href="/moment" className="btn-ghost">
              Practice my moment
            </Link>
            <Link href="/progress" className="btn-ghost">
              Open my plan
            </Link>
          </div>
        ) : (
          <button className="btn-primary mt-5 w-full" onClick={checkout} disabled={busy}>
            {busy ? <Spinner /> : `Get Plus, ${PLANS[plan].label}`}
          </button>
        )}
        {!unlocked && (
          <ul className="mt-3 space-y-1 text-center text-sm text-soft-ink">
            <li>
              <b className="text-ink">{GUARANTEE}.</b> Not helpful? Get a full refund.
            </li>
            <li>No account needed to practice. Help me now is always free.</li>
            <li>Pause any month instead of cancelling. You keep your phrases.</li>
          </ul>
        )}
        <div className="mt-4 rounded-xl bg-peach px-4 py-3 text-sm">
          <b>Test mode, no real charge.</b> Use card <code className="font-mono font-semibold">{TEST_CARD}</code>, any future date, any CVC
          and any ZIP.
        </div>
      </div>

      <RestorePlus />

      <div className="card">
        <p className="font-semibold">How it compares</p>
        <ul className="mt-2 space-y-2 text-sm text-muted">
          <li>
            <b className="text-ink">Good Inside membership:</b> $279/year for courses, community and an AI advice assistant.
          </li>
          <li>
            <b className="text-ink">Positive Parenting Solutions:</b> $14.99/month for courses and coaching.
          </li>
          <li>
            <b className="text-ink">Ayala Plus:</b> $79/year or $12.99/month to practice the exact moment and see which words worked.
          </li>
        </ul>
      </div>
    </div>
  );
}
