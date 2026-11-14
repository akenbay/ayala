"use client";

import { useState } from "react";
import { clock, nextRenewal, update, useStore } from "@/lib/storage";
import { Spinner } from "./ui";

const fmt = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

async function call(sessionId: string, action: "pause" | "resume" | "portal") {
  const r = await fetch("/api/subscription", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, action }),
  });
  return (await r.json()) as { url?: string; pausedUntil?: string; resumed?: boolean; demo?: boolean; error?: string };
}

/**
 * For a parent who has Plus: renewal date, pause instead of cancel, and Stripe's page to cancel or change card.
 * Parenting comes in phases, so a quiet month is a reason to pause, not to lose your phrases.
 */
export function ManagePlus() {
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  if (!store?.unlocked) return null;
  const now = clock();
  const plus = store.plus;
  const sessionId = plus?.checkoutSessionId;
  const demo = Boolean(plus?.demo) || !plus;
  const paused = plus?.pausedUntil && Date.parse(plus.pausedUntil) > now.getTime() ? plus.pausedUntil : null;
  const renews = plus?.since && plus.plan ? nextRenewal(plus.since, plus.plan, paused ? new Date(paused) : now) : null;
  const canManage = Boolean(sessionId) || demo;

  async function pause() {
    setBusy(true);
    setMsg(null);
    try {
      let until: string | undefined;
      if (sessionId) {
        const d = await call(sessionId, "pause");
        if (d.error) throw new Error(d.error);
        until = d.pausedUntil;
      } else until = new Date(now.getTime() + 30 * 86_400_000).toISOString();
      update((s) => {
        s.plus = { ...(s.plus ?? { since: new Date().toISOString(), demo: true }), pausedUntil: until };
      });
      setLeaving(false);
      setMsg(`Paused. No charge until ${fmt(until!)}, and you keep everything.${demo ? " (Demo mode, no real subscription.)" : ""}`);
    } catch (e) {
      setMsg((e as Error).message || "That didn't work. Try again.");
    }
    setBusy(false);
  }

  async function resume() {
    setBusy(true);
    setMsg(null);
    try {
      if (sessionId) {
        const d = await call(sessionId, "resume");
        if (d.error) throw new Error(d.error);
      }
      update((s) => {
        if (s.plus) delete s.plus.pausedUntil;
      });
      setMsg("Billing is back on.");
    } catch (e) {
      setMsg((e as Error).message || "That didn't work. Try again.");
    }
    setBusy(false);
  }

  async function portal() {
    setBusy(true);
    setMsg(null);
    if (!sessionId) {
      // Demo mode: there is no Stripe subscription, so cancelling just locks Plus on this device.
      update((s) => {
        s.unlocked = false;
        delete s.plus;
      });
      setBusy(false);
      return;
    }
    try {
      const d = await call(sessionId, "portal");
      if (d.url) {
        window.location.href = d.url;
        return;
      }
      throw new Error(d.error);
    } catch (e) {
      setMsg((e as Error).message || "That didn't work. Try again.");
    }
    setBusy(false);
  }

  return (
    <section aria-label="Manage Plus" className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-good-soft px-3 py-1.5 text-sm font-semibold text-good">You have Plus ✓</span>
        {plus?.plan && <span className="text-sm text-muted">{plus.plan === "annual" ? "Yearly, $79" : "Monthly, $12.99"}</span>}
      </div>
      <p className="text-[15px] text-soft-ink">
        {paused ? (
          <>
            <b className="text-ink">Paused until {fmt(paused)}.</b> You keep your phrases and practice. Billing starts again then.
          </>
        ) : renews ? (
          <>
            Next renewal: <b className="text-ink">{fmt(renews)}</b>.
          </>
        ) : plus?.restored ? (
          "Restored on this device."
        ) : (
          "Plus is on for this device."
        )}
        {demo && " Demo mode: no real subscription."}
      </p>

      {msg && <p className="rounded-xl bg-peach px-4 py-2.5 text-sm">{msg}</p>}

      {!canManage ? (
        <p className="text-[14px] text-muted">To pause, cancel or change your card, use the link in your Stripe receipt email.</p>
      ) : leaving ? (
        <div role="alertdialog" aria-label="Before you cancel" className="anim-fade-down flex flex-col gap-2.5 rounded-2xl bg-cream p-4">
          <p className="text-[16px] font-bold">Before you go: pause for 30 days instead?</p>
          <p className="-mt-1 text-[14px] text-soft-ink">
            Hard phases come and go. Pausing keeps your phrases and progress and costs nothing until it ends.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={pause} disabled={busy}>
              {busy ? <Spinner /> : "Pause instead"}
            </button>
            <button type="button" className="btn-ghost" onClick={portal} disabled={busy}>
              {sessionId ? "Continue to cancel" : "Cancel Plus (demo)"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {paused ? (
            <button type="button" className="btn-ghost" onClick={resume} disabled={busy}>
              {busy ? <Spinner /> : "Resume billing now"}
            </button>
          ) : (
            <button type="button" className="btn-ghost" onClick={pause} disabled={busy}>
              {busy ? <Spinner /> : "Pause for a month"}
            </button>
          )}
          {sessionId && (
            <button type="button" className="btn-ghost" onClick={portal} disabled={busy}>
              Change card or plan
            </button>
          )}
          <button type="button" className="min-h-11 px-2 text-[15px] font-semibold text-muted underline underline-offset-[3px]" onClick={() => setLeaving(true)}>
            Cancel Plus
          </button>
        </div>
      )}
    </section>
  );
}

/** "Already have Plus?": unlocks again on a new device or after browser data was cleared. */
export function RestorePlus() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  if (!store || store.unlocked) return null;

  async function restore() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/restore", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const d = (await r.json()) as { unlocked?: boolean; demo?: boolean; error?: string };
      if (d.unlocked) {
        update((s) => {
          s.unlocked = true;
          s.plus = { since: new Date().toISOString(), restored: true };
        });
        setMsg({ tone: "good", text: "Plus is back on this device." });
      } else if (d.demo) setMsg({ tone: "bad", text: "Restore needs Stripe, which isn't connected on this server." });
      else setMsg({ tone: "bad", text: d.error ?? "We couldn't find an active Plus subscription for that email." });
    } catch {
      setMsg({ tone: "bad", text: "Connection problem. Try again." });
    }
    setBusy(false);
  }

  return (
    <div className="text-center">
      {!open ? (
        <button type="button" className="min-h-11 px-2 text-[15px] font-semibold underline underline-offset-[3px]" onClick={() => setOpen(true)}>
          Already have Plus? Restore it
        </button>
      ) : (
        <div className="anim-fade-down flex flex-col gap-2 rounded-2xl bg-white p-4 text-left">
          <label htmlFor="restoreEmail" className="text-[15px] font-bold">
            The email you used at checkout
          </label>
          <div className="flex gap-2">
            <input
              id="restoreEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-field bg-cream px-3.5 text-base outline-none focus:border-ink"
            />
            <button type="button" className="btn-primary h-12 shrink-0 px-5" onClick={restore} disabled={busy || !email.includes("@")}>
              {busy ? <Spinner /> : "Restore"}
            </button>
          </div>
          <p className="text-[13px] text-muted">Your progress lives in this browser, so clearing it or switching phones needs a restore. We only check for an active subscription.</p>
          {msg && <p className={`rounded-xl px-4 py-2.5 text-sm ${msg.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{msg.text}</p>}
        </div>
      )}
    </div>
  );
}
