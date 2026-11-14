"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { HELP_SCRIPTS, REPAIR_SCRIPT, generalScript, matchScript, scriptById, type HelpScript } from "@/lib/helpNow";
import { CDC } from "@/lib/rubric/cdc";
import { SCENARIOS } from "@/lib/scenarios";
import { detectCrisis, type Crisis } from "@/lib/safety";
import { newId, ownMomentLocked, phrasesFor, update, useStore } from "@/lib/storage";
import { CrisisCard } from "@/components/CrisisCard";
import { Arrow, Back, Bolt, Info } from "@/components/icons";
import { HomeCheck } from "@/components/PhraseBank";

export default function HelpNowPage() {
  // useSearchParams needs a Suspense boundary so the page can still be prerendered.
  return (
    <Suspense fallback={null}>
      <HelpNow />
    </Suspense>
  );
}

/**
 * "What do I say right now?": one tap, one short script. No chat, no score.
 * The open script lives in the URL (?s=bedtime), so the header button and the phone's Back button
 * return to the list. A typed moment's script (?s=yours) is kept in memory only, never in the URL.
 */
function HelpNow() {
  const router = useRouter();
  const params = useSearchParams();
  const store = useStore();
  const [yours, setYours] = useState<HelpScript | null>(null);
  const [useId, setUseId] = useState<string | null>(null);
  const [helped, setHelped] = useState<boolean | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [crisis, setCrisis] = useState<Crisis["kind"] | null>(null);
  const sid = params.get("s");
  const script = sid === "yours" ? yours : (scriptById(sid) ?? null);

  function open(s: HelpScript) {
    const id = newId();
    if (s.id === "ai" || s.id === "general") setYours(s);
    setUseId(id);
    setHelped(null);
    update((st) => {
      st.helpUses = [...(st.helpUses ?? []), { id, situation: s.id, createdAt: new Date().toISOString() }].slice(-200);
    });
    router.push(`/help?s=${s.id === "ai" || s.id === "general" ? "yours" : s.id}`);
    window.scrollTo({ top: 0 });
  }

  async function openTyped() {
    const t = typed.trim();
    if (!t || busy) return;
    const c = detectCrisis(t);
    if (c) {
      setCrisis(c.kind);
      return;
    }
    const ready = matchScript(t);
    // "I yelled" always gets the repair script: it is a different kind of help than a direction.
    if (ready?.id === "repair") {
      open(ready);
      return;
    }
    // Ask for words written for this exact moment first ("teeth before bed" is about teeth, not bedtime).
    // A ready script is the fallback when the AI is slow, offline or its words fail a check.
    setBusy(true);
    let s: HelpScript | null = null;
    try {
      const r = await fetch("/api/help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ situation: t, age: store?.childAge ?? 3 }),
      });
      const d = (await r.json()) as { script?: HelpScript | null; crisis?: Crisis["kind"] };
      if (d.crisis) {
        setBusy(false);
        setCrisis(d.crisis);
        return;
      }
      s = d.script ?? null;
    } catch {
      /* offline or slow: fall through to a ready script */
    }
    setBusy(false);
    open(s ?? ready ?? generalScript(t));
  }

  function rate(v: boolean) {
    setHelped(v);
    update((st) => {
      st.helpUses = (st.helpUses ?? []).map((h) => (h.id === useId ? { ...h, helped: v } : h));
    });
  }

  function practice(s: HelpScript) {
    if (s.id === "repair") {
      router.push("/moment?mode=lost");
      return;
    }
    if (s.practice !== "custom") {
      if (!SCENARIOS[s.practice].free && !store?.unlocked) {
        router.push("/pricing?from=" + s.practice);
        return;
      }
      update((st) => {
        st.current = s.practice;
        st.currentPlanDay = null;
        st.lesson = null;
      });
      router.push("/practice");
      return;
    }
    if (store && ownMomentLocked(store)) {
      router.push("/pricing?from=moment");
      return;
    }
    update((st) => {
      st.custom = { situation: s.situation };
      st.current = "custom";
      st.currentPlanDay = null;
      st.lesson = null;
    });
    router.push("/practice");
  }

  if (crisis)
    return (
      <div className="mx-auto max-w-xl py-4">
        <CrisisCard kind={crisis} />
      </div>
    );

  if (script) {
    const mine = phrasesFor(store?.phrases, script.practice, script.keywords).slice(0, 2);
    const src = CDC[script.cdc];
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push("/help")} aria-label="Pick another moment" className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
            <Back size={20} />
          </button>
          <h1 className="font-display text-[26px] leading-tight">{script.label}</h1>
        </div>

        {mine.length > 0 && (
          <section aria-label="Your saved words" className="rounded-3xl border-2 border-good-line bg-good-soft p-5">
            <span className="label-caps text-good">Your words, saved from practice</span>
            <ul className="mt-2 flex flex-col gap-2">
              {mine.map((p) => (
                <li key={p.id} className="text-[20px] font-semibold leading-snug">
                  &ldquo;{p.text}&rdquo;
                </li>
              ))}
            </ul>
          </section>
        )}

        {script.id === "general" && (
          <p className="rounded-2xl bg-white px-4 py-3 text-[15px] text-soft-ink">
            We couldn&apos;t write words for that exact moment right now, so here is a calm start that works for any hard moment.
          </p>
        )}

        <section aria-label="Say this" className="anim-rise rounded-3xl bg-white p-5 shadow-soft">
          <span className="label-caps text-amber-text">Say this, slowly</span>
          <ol className="mt-3 flex flex-col gap-3">
            {script.say.map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-peach text-[15px] font-extrabold">{i + 1}</span>
                <span className="text-[22px] font-semibold leading-snug">{line}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl bg-peach p-4">
          <p className="text-[15px] font-bold">If they keep going</p>
          <p className="mt-1 text-[16px] leading-snug">{script.ifMore}</p>
          <p className="mt-3 border-t border-ink/10 pt-2.5 text-[14px] text-soft-ink">
            <b className="text-bad">Skip:</b> {script.avoid}
          </p>
        </section>

        <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-white px-4 py-3.5 text-center">
          {helped === null ? (
            <>
              <p className="text-[16px] font-bold">Did this help?</p>
              <div className="flex gap-2">
                <button type="button" className="btn-orange min-w-24" onClick={() => rate(true)}>
                  Yes
                </button>
                <button type="button" className="btn-ghost min-w-24" onClick={() => rate(false)}>
                  Not really
                </button>
              </div>
            </>
          ) : (
            <p className="text-[15px] font-semibold text-soft-ink">
              {helped ? "Glad it helped. Practice it once and it comes out easier next time." : "Thanks for telling us. Practicing your own words for this moment usually works better than a script."}
            </p>
          )}
        </div>

        <button type="button" className="btn-primary h-14 text-lg" onClick={() => practice(script)}>
          {script.id === "repair" ? "Practice the repair" : "Practice this for next time"} <Arrow size={20} />
        </button>

        <a href={src.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 self-center text-[14px] font-semibold underline underline-offset-[3px]">
          <Info size={15} /> Based on {src.name}
        </a>
        <p className="text-center text-[13px] text-muted">
          {script.id === "ai" ? "Written for your moment by AI from CDC guidance and checked by our rubric. " : "A short script from CDC guidance. "}
          Not medical advice. If anyone is in danger, call 911.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 py-4">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Back to home" className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
          <Back size={20} />
        </Link>
        <h1 className="font-display text-[28px] leading-tight">What do I say right now?</h1>
      </div>
      <p className="-mt-2 text-[16px] text-soft-ink">Tap the moment. You get three short lines to say. No typing needed.</p>

      <HomeCheck />

      <div className="grid grid-cols-2 gap-2.5">
        {HELP_SCRIPTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => open(s)}
            className="flex min-h-[76px] items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-left text-[17px] font-bold leading-tight transition hover:shadow-[0_0_0_2px_#30251F] active:scale-[0.98]"
          >
            <Bolt size={18} className="shrink-0 text-amber-text" />
            {s.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => open(REPAIR_SCRIPT)}
        className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border-[1.5px] border-dashed border-field bg-paper px-4 py-3 text-left"
      >
        <span>
          <span className="block text-[17px] font-bold">I yelled. How do I repair?</span>
          <span className="block text-[14px] text-muted">It happens to every parent.</span>
        </span>
        <Arrow size={20} />
      </button>

      <div className="flex flex-col gap-2">
        <label htmlFor="typed" className="text-[15px] font-bold">
          Or say what&apos;s happening
        </label>
        <div className="flex gap-2">
          <input
            id="typed"
            value={typed}
            maxLength={160}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && openTyped()}
            disabled={busy}
            placeholder="He won't get in the bath"
            className="h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-field bg-white px-3.5 text-base outline-none focus:border-ink"
          />
          <button type="button" className="btn-primary h-12 shrink-0 px-5" onClick={openTyped} disabled={!typed.trim() || busy}>
            {busy ? <span aria-label="Writing" className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" /> : "Help"}
          </button>
        </div>
        {busy && <p className="text-[14px] text-muted">Writing words for your moment…</p>}
      </div>
    </div>
  );
}
