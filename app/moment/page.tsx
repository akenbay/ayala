"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_SITUATION } from "@/lib/scenarios";
import { MAX_CHARS } from "@/lib/rubric/validate";
import { detectCrisis, type Crisis } from "@/lib/safety";
import { update, useStore } from "@/lib/storage";
import { CrisisCard } from "@/components/CrisisCard";
import { Arrow, Back } from "@/components/icons";

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

  function start() {
    const s = situation.trim();
    const w = said.trim();
    const c = detectCrisis(`${s} ${w}`);
    if (c) {
      setCrisis(c.kind);
      return;
    }
    if (s.split(/\s+/).length < 4) {
      setError("Tell us a little more: where you are and what your child does.");
      return;
    }
    update((st) => {
      st.custom = { situation: s.slice(0, MAX_SITUATION), ...(mode === "lost" && w ? { said: w.slice(0, MAX_CHARS) } : {}) };
      st.current = "custom";
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
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Back to home" className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
          <Back size={20} />
        </Link>
        <h1 className="text-[28px] font-extrabold tracking-tight">Your own moment</h1>
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
          className="resize-none rounded-2xl border-[1.5px] border-field bg-white px-4 py-3 text-[17px] leading-snug outline-none placeholder:text-[#6B6960] focus:border-ink"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.slice(1).map((ex) => (
            <button key={ex} type="button" onClick={() => setSituation(ex)} className="rounded-full bg-white px-3 py-1.5 text-left text-[13px] font-semibold">
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
            className="resize-none rounded-2xl border-[1.5px] border-field bg-white px-4 py-3 text-[17px] leading-snug outline-none placeholder:text-[#6B6960] focus:border-ink"
          />
        </div>
      )}

      {error && <p className="text-sm font-semibold text-bad">{error}</p>}

      <button type="button" className="btn-primary h-14 text-lg" onClick={start} disabled={!situation.trim()}>
        Start practicing <Arrow size={20} />
      </button>
      <p className="text-center text-[13px] text-muted">Sam is a practice character. Scores use the same CDC based checks.</p>
    </div>
  );
}
