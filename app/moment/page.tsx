"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MAX_SITUATION } from "@/lib/scenarios";
import { MAX_CHARS } from "@/lib/rubric/validate";
import { detectCrisis, type Crisis } from "@/lib/safety";
import { FREE_OWN_MOMENTS, ownMomentLocked, update, useStore } from "@/lib/storage";
import { CrisisCard } from "@/components/CrisisCard";
import { Arrow } from "@/components/icons";

const EXAMPLES = [
  "My 3 year old screams and drops to the floor when I turn off the TV before bath.",
  "My son won't get in the car seat in the morning and arches his back.",
  "At the store my daughter grabs candy and yells when I say no.",
];

/** The parent describes their own hard moment, optionally with what they actually said. */
export default function MomentPage() {
  const router = useRouter();
  const store = useStore();
  const [mode, setMode] = useState<"describe" | "lost">("describe");
  const [situation, setSituation] = useState("");
  const [said, setSaid] = useState("");
  const [error, setError] = useState("");
  const [crisis, setCrisis] = useState<Crisis["kind"] | null>(null);
  const age = store?.childAge ?? 3;
  const locked = store ? ownMomentLocked(store) : false;

  // Help me now links here with ?mode=lost after "I yelled".
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") !== "lost") return;
    (async () => {
      await Promise.resolve();
      setMode("lost");
    })();
  }, []);

  function start() {
    const s = situation.trim();
    const w = said.trim();
    const c = detectCrisis(`${s} ${w}`);
    if (c) {
      setCrisis(c.kind);
      return;
    }
    if (locked) {
      router.push("/pricing?from=moment");
      return;
    }
    if (s.split(/\s+/).length < 4) {
      setError("Tell us a little more: where you are and what your child does.");
      return;
    }
    update((st) => {
      st.custom = { situation: s.slice(0, MAX_SITUATION), ...(mode === "lost" && w ? { said: w.slice(0, MAX_CHARS) } : {}) };
      st.current = "custom";
      st.lesson = null;
      st.currentPlanDay = null;
    });
    router.push("/practice");
  }

  if (crisis)
    return (
      <div className="mx-auto max-w-xl py-4">
        <CrisisCard kind={crisis} />
      </div>
    );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 py-4">
      <div>
        <h1 className="font-display text-[34px] leading-tight">Your own moment</h1>
        <p className="mt-1 text-[16px] text-muted">The hard moment that really happens at your home. Sam plays it, and you practice what to say.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-full bg-white p-1" role="tablist" aria-label="What do you want to practice?">
        {(
          [
            ["describe", "A moment coming up"],
            ["lost", "Today I lost it"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`min-h-11 rounded-full px-3 text-[15px] font-bold transition ${mode === id ? "bg-ink text-cream" : "text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-[17px] leading-snug text-soft-ink">
        {mode === "describe"
          ? `Describe the moment that's hard with your ${age} year old. Sam will play it, and you'll practice what to say.`
          : "It happens to every parent. Write what happened and what you actually said. You'll see how Sam hears it, then practice a better way. No judgment, and nothing leaves your browser except to score it."}
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="situation" className="text-[15px] font-bold">
          What happens?
        </label>
        <textarea
          id="situation"
          rows={3}
          value={situation}
          maxLength={MAX_SITUATION}
          onChange={(e) => {
            setSituation(e.target.value);
            setError("");
          }}
          placeholder={EXAMPLES[0]}
          className="resize-none rounded-2xl border-[1.5px] border-field bg-white px-4 py-3 text-[17px] leading-snug outline-none placeholder:text-muted focus:border-ink"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.slice(1).map((ex) => (
            <button key={ex} type="button" onClick={() => {
                setSituation(ex);
                setError("");
              }} className="rounded-full bg-white px-3 py-1.5 text-left text-[13px] font-semibold">
              {ex}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted">Please don&apos;t use real names.</p>
      </div>

      {mode === "lost" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="said" className="text-[15px] font-bold">
            What did you actually say? <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="said"
            rows={2}
            value={said}
            maxLength={MAX_CHARS}
            onChange={(e) => setSaid(e.target.value)}
            placeholder="I yelled: That's it, no TV ever again!"
            className="resize-none rounded-2xl border-[1.5px] border-field bg-white px-4 py-3 text-[17px] leading-snug outline-none placeholder:text-muted focus:border-ink"
          />
        </div>
      )}

      {error && <p className="text-sm font-semibold text-bad">{error}</p>}

      {locked && (
        <p className="rounded-2xl bg-peach px-4 py-3 text-[15px]">
          You&apos;ve used your free own moment{FREE_OWN_MOMENTS > 1 ? "s" : ""}. <b>Plus</b> lets you practice every real moment, as often as it happens.
        </p>
      )}
      <button type="button" className="btn-primary h-14 text-lg" onClick={start} disabled={!situation.trim() && !locked}>
        {locked ? "Unlock with Plus" : "Start practicing"} <Arrow size={20} />
      </button>
      <p className="text-center text-[13px] text-muted">Sam is a practice character. Scores use the same CDC based checks.</p>
    </div>
  );
}
