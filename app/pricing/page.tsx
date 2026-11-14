"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GUARANTEE, PLANS, TEST_CARD, type PlanId } from "@/lib/pricing";
import { update, useStore } from "@/lib/storage";
import { Spinner } from "@/components/ui";

const FEATURES: [string, string][] = [
  ["All scenarios", "Hitting a sibling, plus every new moment we add (getting dressed, car seat, screen time)."],
  ["The full 7 day plan", "One short daily practice aimed at your weakest skill."],
  ["Saved progress", "Your history, best scores and skill trends in one place."],
  ["New situations to test yourself", "Practice the skill in a new setting with no script."],
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
        const d = (await r.json()) as { unlocked?: boolean };
        if (d.unlocked) {
          update((s) => {
            s.unlocked = true;
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
        <h1 className="mt-3 text-[32px] font-extrabold leading-tight tracking-tight">Keep practicing through the toddler years</h1>
        <p className="mt-2 text-muted">The free practice shows what works. Plus makes it a habit: a few minutes a day, aimed at the skill you need most.</p>
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
            <span className="rounded-full bg-good-soft px-3 py-1.5 text-sm font-semibold text-good">You have Plus ✓</span>
            <Link href="/" className="btn-primary">
              Practice now
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
            <li>No account or email needed. The practice is free.</li>
          </ul>
        )}
        <div className="mt-4 rounded-xl bg-peach px-4 py-3 text-sm">
          <b>Test mode, no real charge.</b> Use card <code className="font-mono font-semibold">{TEST_CARD}</code>, any future date, any CVC
          and any ZIP.
        </div>
      </div>

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
