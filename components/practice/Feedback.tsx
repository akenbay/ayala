"use client";

import { Fragment, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import type { Scorecard } from "@/lib/rubric/types";
import { FOCUS_TIPS, useStore, type Attempt, type Turn } from "@/lib/storage";
import { CDC_URL, Highlighted, Legend, findMarks } from "@/components/ui";
import { type Coach } from "@/lib/coach";
import { SavePhrase } from "@/components/PhraseBank";
import { ChevronDown, Info } from "@/components/icons";
import { STATE_DOT, biggestMiss } from "@/components/practice/shared";

export function outcomeLine(a: Attempt): string | null {
  if (!a.outcome) return null;
  const n = a.turns.length;
  const after = `after ${n} ${n === 1 ? "reply" : "replies"}`;
  return {
    going_along: `Sam went along ${after}.`,
    meltdown: `Sam melted down ${after}.`,
    gave_in: `Sam got their way ${after}.`,
    resisting: `Sam was still resisting ${after}.`,
  }[a.outcome];
}

export function OutcomeChip({ a }: { a: Attempt }) {
  const line = outcomeLine(a);
  if (!line || !a.outcome) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[15px] font-semibold">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${STATE_DOT[a.outcome]}`} />
      {line}
    </span>
  );
}

export function Collapsible({ label, children, defaultOpen = false }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-line pt-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-[52px] w-full items-center justify-between px-0.5 text-base font-semibold"
      >
        {label}
        <ChevronDown size={20} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="anim-fade-down space-y-4 pb-2 pt-1">{children}</div>}
    </section>
  );
}

export function YourWords({ turn }: { turn: Turn }) {
  const marks = findMarks(turn.parent, turn.card.checks);
  const firstBad = marks.findIndex((m) => !m.good);
  const [picked, setPicked] = useState(firstBad >= 0 ? firstBad : marks.length ? 0 : -1);
  const m = marks[picked];
  return (
    <section aria-label="Your words" className="flex flex-col gap-3.5 rounded-2xl bg-white p-[18px]">
      <span className="label-caps">Your words</span>
      <p className="text-[19px] leading-[1.75]">
        <Highlighted text={turn.parent} checks={turn.card.checks} picked={picked} onPick={(i) => setPicked(i)} />
      </p>
      {m && (
        <div aria-live="polite" className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 ${m.good ? "bg-good-soft" : "bg-bad-soft"}`}>
          <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${m.good ? "bg-good-line" : "bg-red"}`} />
          <p className="text-base leading-snug">
            <b>{m.good ? "Helped." : "Hurt."}</b> {m.check.explanation}
          </p>
        </div>
      )}
      {marks.length > 0 ? <Legend hint="Tap a phrase" /> : <p className="text-sm text-muted">No phrase stood out either way. See the breakdown below.</p>}
    </section>
  );
}

export function BiggestWin({ card }: { card: Scorecard }) {
  const miss = biggestMiss(card);
  if (!miss)
    return (
      <section className="rounded-2xl bg-good-soft p-[18px]">
        <span className="label-caps text-good">Every check passed</span>
        <p className="mt-2 text-[19px] font-semibold leading-snug">That&apos;s a strong reply. Try it again in a new situation.</p>
      </section>
    );
  const url = CDC_URL[miss.cdcBasis];
  return (
    <section aria-label="Biggest win" className="flex flex-col gap-2.5 rounded-2xl bg-peach p-[18px]">
      <span className="label-caps text-ink">Biggest win: {miss.label.toLowerCase()}</span>
      <p className="text-[19px] font-semibold leading-snug">{FOCUS_TIPS[miss.dimension]}</p>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 self-start py-1.5 text-sm font-semibold underline underline-offset-[3px]">
          <Info size={16} /> Based on CDC guidance
        </a>
      )}
    </section>
  );
}

/** Shows the rewrite with the words the parent didn't say highlighted, so the change is easy to see. */
export function DiffText({ from, to }: { from: string; to: string }) {
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");
  const had = new Set(from.split(/\s+/).map(norm).filter(Boolean));
  const tokens = to.split(/(\s+)/);
  return (
    <>
      {tokens.map((tok, i) =>
        /^\s+$/.test(tok) || had.has(norm(tok)) ? (
          <Fragment key={i}>{tok}</Fragment>
        ) : (
          <mark key={i} className="good anim-rise" style={{ animationDelay: `${150 + Math.min(i, 30) * 25}ms` }}>
            {tok}
          </mark>
        ),
      )}
    </>
  );
}

export function CoachLoading() {
  return (
    <section role="status" aria-label="Reading your conversation" className="flex flex-col gap-3 rounded-2xl bg-white p-[18px]">
      <span className="label-caps">Reading your conversation</span>
      <span className="shimmer h-3 w-[90%] rounded-full bg-track" />
      <span className="shimmer h-3 w-[70%] rounded-full bg-track" style={{ animationDelay: "0.2s" }} />
      <span className="shimmer h-3 w-[80%] rounded-full bg-track" style={{ animationDelay: "0.4s" }} />
    </section>
  );
}

/** What happened, what to keep and what to change: all about this parent's own words. */
export type CoachPart = "summary" | "keep" | "change" | "heard";

export function CoachNotes({
  coach,
  showChange = true,
  parts = ["summary", "keep", "change", "heard"],
}: {
  coach: Coach;
  showChange?: boolean;
  parts?: CoachPart[];
}) {
  const show = (p: CoachPart) => parts.includes(p);
  return (
    <section aria-label="Your coach" className="flex flex-col gap-4 rounded-2xl bg-white p-[18px]">
      {show("summary") && (
        <div>
          <span className="label-caps">What happened</span>
          <p className="mt-1.5 text-[18px] font-semibold leading-snug">{coach.summary}</p>
        </div>
      )}
      {show("keep") && coach.keep && (
        <div className="flex gap-3">
          <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-good-line" />
          <p className="text-base leading-snug">
            <b>Keep</b> <span className="rounded bg-good-soft px-1">&ldquo;{coach.keep.quote}&rdquo;</span> {coach.keep.why}
          </p>
        </div>
      )}
      {showChange && show("change") && (
        <div className="flex gap-3">
          <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-red" />
          <p className="text-base leading-snug">
            <b>Change</b>{" "}
            {coach.change.quote && (
              <span className="underline decoration-red decoration-wavy decoration-2 underline-offset-4">&ldquo;{coach.change.quote}&rdquo;</span>
            )}{" "}
            {coach.change.why}
            {coach.change.cdc && CDC_URL[coach.change.cdc] && (
              <a
                href={CDC_URL[coach.change.cdc]}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1.5 text-sm font-semibold underline underline-offset-[3px]"
              >
                <Info size={15} /> From {coach.change.cdc}
              </a>
            )}
          </p>
        </div>
      )}
      {show("heard") && coach.heard && (
        <div className={`flex items-start gap-2.5 ${parts.length > 1 ? "border-t border-line pt-3.5" : ""}`}>
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange text-[15px] font-extrabold">
            S
          </span>
          <div>
            <span className="label-caps">How Sam heard it</span>
            <p className="mt-1 rounded-[18px] rounded-tl-md bg-peach px-3.5 py-2.5 text-base italic leading-snug">&ldquo;{coach.heard}&rdquo;</p>
          </div>
        </div>
      )}
    </section>
  );
}

/** A short label for where a phrase came from, shown in the phrase bank. */
export function phraseSituation(a: Attempt, ownSituation?: string): string {
  if (a.kind === "transfer") return SCENARIOS[a.scenarioId].transfer.title;
  if (a.scenarioId === "custom") {
    const t = (ownSituation ?? "Your own moment").trim();
    return t.length > 60 ? t.slice(0, 57).trimEnd() + "…" : t;
  }
  return SCENARIOS[a.scenarioId].short;
}

export function Improved({ rewrite, attempt }: { rewrite: NonNullable<Coach["rewrite"]>; attempt: Attempt }) {
  const own = useStore()?.custom?.situation;
  return (
    <section aria-label="Your words, improved" className="flex flex-col gap-2.5 rounded-2xl bg-peach p-[18px]">
      <span className="label-caps text-ink">Your words, improved</span>
      <p className="text-[15px] text-soft-ink">
        You said: <span className="italic">&ldquo;{rewrite.from}&rdquo;</span>
      </p>
      <p className="text-[19px] font-semibold leading-relaxed">
        &ldquo;
        <DiffText from={rewrite.from} to={rewrite.text} />
        &rdquo;
      </p>
      <p className="text-sm text-soft-ink">
        Highlighted words are new. Same checks: {rewrite.before} → <b className="text-ink">{rewrite.after}</b>.
      </p>
      <SavePhrase text={rewrite.text} scenarioId={attempt.scenarioId} situation={phraseSituation(attempt, own)} score={rewrite.after} />
    </section>
  );
}
