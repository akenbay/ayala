"use client";

import Link from "next/link";
import { useState } from "react";
import { SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import type { CheckId } from "@/lib/rubric/types";
import { FOCUS_TIPS, buildPlan, update, useStore, type Attempt, weakestDimension } from "@/lib/storage";
import { CheckList, CountUp, Sparkles, DimensionBars, Highlighted, ScoreRing } from "@/components/ui";
import { type Coach } from "@/lib/coach";
import { Sam, faceFor } from "@/components/Sam";
import { PlanPicker } from "@/components/PlanPicker";
import { SavePhrase } from "@/components/PhraseBank";
import { DIMENSION_LABELS } from "@/lib/rubric/types";
import { Arrow, ArrowDown, ArrowUp, Check } from "@/components/icons";
import { verdict } from "@/components/practice/shared";
import { BiggestWin, CoachLoading, CoachNotes, Collapsible, Improved, OutcomeChip, YourWords, phraseSituation } from "@/components/practice/Feedback";

/** First feedback: one change, your improved sentence, and the retry. Everything else is one tap away. */
export function AttemptScore({ attempt, coach, onRetry }: { attempt: Attempt; coach?: Coach | "loading"; onRetry: () => void }) {
  const [turnIdx, setTurnIdx] = useState(() =>
    attempt.turns.reduce((worst, t, i, arr) => (t.card.total < arr[worst].card.total ? i : worst), 0),
  );
  const t = attempt.turns[turnIdx];
  const c = typeof coach === "object" ? coach : null;
  return (
    <div className="flex flex-col gap-4 py-5">
      <div className="anim-rise flex items-center gap-4">
        <ScoreRing value={attempt.total} size={84} />
        <div className="flex flex-col items-start gap-1.5">
          <OutcomeChip a={attempt} />
          <h1 className="font-display text-[24px] leading-tight">{verdict(t.card)}</h1>
        </div>
      </div>
      <p className="-mt-2 text-[13px] text-muted">This scores the practice response, not you as a parent.</p>

      <div className="anim-rise" style={{ animationDelay: "80ms" }}>
        {c ? <CoachNotes coach={c} parts={["keep", "change"]} /> : coach === "loading" ? <CoachLoading /> : <BiggestWin card={t.card} />}
      </div>
      {c?.rewrite && (
        <div className="anim-rise" style={{ animationDelay: "160ms" }}>
          <Improved rewrite={c.rewrite} attempt={attempt} />
        </div>
      )}

      <button type="button" className="btn-primary h-[58px] text-lg" onClick={onRetry}>
        Try again in your own words <Arrow size={20} />
      </button>

      <Collapsible label="More about this reply" defaultOpen>
        {c && <CoachNotes coach={c} parts={["summary", "heard"]} />}
        {attempt.turns.length > 1 && (
          <div className="flex justify-center gap-2" role="group" aria-label="Pick a reply">
            {attempt.turns.map((x, i) => (
              <button key={i} type="button" className="chip" aria-pressed={turnIdx === i} onClick={() => setTurnIdx(i)}>
                Reply {i + 1} · {x.card.total}
              </button>
            ))}
          </div>
        )}
        <YourWords key={turnIdx} turn={t} />
        <div className="rounded-2xl bg-white p-[18px]">
          <DimensionBars card={t.card} />
        </div>
        <CheckList card={t.card} />
      </Collapsible>
    </div>
  );
}

/** Praise the exact skill that improved, not the score. */
export const GAIN_VERB: Partial<Record<CheckId, string>> = {
  acknowledges_feeling: "named the feeling first",
  states_limit: "said the limit calmly",
  two_ok_choices: "offered two choices",
  alternative_or_praise: "said what Sam can do instead",
  no_yelling: "kept your voice calm",
  no_shaming: "dropped the harsh words",
  no_empty_threats: "dropped the threat",
  no_bribe: "held the limit without a deal",
  states_not_asks: "said it as a statement",
  specific_action: "made the direction specific",
  one_direction: "gave one direction at a time",
};

/** One tap: would the parent really say this? A usefulness signal kept with the attempt. */
export function UsefulAsk({ attemptId }: { attemptId: string }) {
  const [answer, setAnswer] = useState<boolean | null>(null);
  function pick(v: boolean) {
    setAnswer(v);
    update((s) => {
      s.attempts = s.attempts.map((x) => (x.id === attemptId ? { ...x, useful: v } : x));
    });
  }
  return (
    <section aria-label="Could you say this?" className="flex flex-col items-center gap-2.5 rounded-2xl bg-white px-4 py-3.5 text-center">
      {answer === null ? (
        <>
          <p className="text-[17px] font-bold">Could you actually say this to your child?</p>
          <div className="flex gap-2">
            <button type="button" className="btn-orange min-w-24" onClick={() => pick(true)}>
              Yes
            </button>
            <button type="button" className="btn-ghost min-w-24" onClick={() => pick(false)}>
              Not quite
            </button>
          </div>
        </>
      ) : (
        <p className="text-[15px] font-semibold text-soft-ink">
          {answer ? "Great. Say it out loud once, it sticks better." : "Thanks. Make it yours: change the words until they sound like you."}
        </p>
      )}
    </section>
  );
}

/** Shown right after the first before and after, the earliest moment the value is real. "Not now" stays free. */
export function Paywall({ onContinue }: { onContinue: () => void }) {
  const store = useStore();
  if (!store) return null;
  const weakest = weakestDimension(store.attempts) ?? store.profile?.focus ?? "emotional_response";
  const plan = store.plan.length ? store.plan : buildPlan(store.attempts, weakest);
  const focus = (plan.find((d) => !d.done) ?? plan[0]).focus;
  if (store.unlocked)
    return (
      <div className="flex flex-col gap-4 py-6">
        <h1 className="text-[26px] font-extrabold">Welcome to Plus.</h1>
        <button type="button" className="btn-primary h-14 text-lg" onClick={onContinue}>
          Try the new situation <Arrow size={20} />
        </button>
      </div>
    );
  return (
    <div className="anim-rise flex flex-col gap-4 py-5">
      <div>
        <span className="label-caps text-amber-text">Your plan</span>
        <h1 className="font-display mt-1 text-[30px] leading-tight">
          7 days on {DIMENSION_LABELS[focus].toLowerCase()}
        </h1>
        <p className="mt-1.5 text-[17px] text-soft-ink">{FOCUS_TIPS[focus]}</p>
      </div>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Plan days">
        {plan.map((p) => (
          <li
            key={p.day}
            className={`flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] font-bold ${
              p.done ? "bg-good-soft text-good" : "bg-white text-muted"
            }`}
          >
            {p.done ? (
              <span className="anim-pop" style={{ animationDelay: "250ms" }}>
                <Check size={14} />
              </span>
            ) : (
              p.day
            )}
            <span className="sr-only">{p.done ? `Day ${p.day} done` : `Day ${p.day}`}</span>
          </li>
        ))}
      </ol>
      <p className="-mt-1 text-[15px] font-semibold">Day 1 done. With Plus you also get:</p>
      <ul className="-mt-1 flex flex-col gap-1.5 text-[15px] text-soft-ink">
        <li>✓ Practice every real moment: unlimited Your own moment and Today I lost it</li>
        <li>✓ All your saved phrases, shown first in Help me now</li>
        <li>✓ New situations with no tips, and new moments as your child grows</li>
      </ul>
      <PlanPicker onUnlocked={() => undefined} />
      <button type="button" onClick={onContinue} className="min-h-12 text-[16px] font-semibold underline underline-offset-[3px]">
        Not now, continue free
      </button>
    </div>
  );
}

export function Compare({
  a,
  b,
  coach,
  scenarioId,
  onTransfer,
  ownSituation,
}: {
  a: Attempt;
  b: Attempt;
  coach?: Coach | "loading";
  scenarioId: ScenarioId;
  onTransfer: () => void;
  ownSituation?: string;
}) {
  const ta = a.turns[0];
  const tb = b.turns[0];
  const d = b.total - a.total;
  const gained = tb.card.checks
    .filter((c) => c.passed && !ta.card.checks.find((x) => x.id === c.id)?.passed)
    .sort((x, y) => y.maxPoints - x.maxPoints);
  return (
    <div className="flex flex-col gap-[18px] py-6">
      <div className="anim-rise flex flex-col items-center gap-2 text-center">
        <Sam face={faceFor(b.outcome)} size={96} />
        {d > 0 ? (
          <>
            <p className="relative flex items-center gap-1 text-[64px] font-extrabold leading-none tracking-[-0.03em] text-good tabular-nums">
              <Sparkles />
              <ArrowUp size={44} />+<CountUp value={d} />
            </p>
            <p className="text-[17px] font-semibold text-soft-ink">
              points from your first try ({a.total} → <b className="text-ink">{b.total}</b>)
            </p>
          </>
        ) : (
          <>
            <ScoreRing value={b.total} size={110} />
            <span className={`rounded-full px-3.5 py-1.5 text-base font-extrabold ${d < 0 ? "bg-bad-soft text-bad" : "bg-white"}`}>
              {d === 0 ? "Same as your first try" : `−${Math.abs(d)} from your first try`}
            </span>
          </>
        )}
        <h1 className="font-display mt-1 max-w-[340px] text-[26px] leading-tight">
          {gained[0] ? `You ${GAIN_VERB[gained[0].id] ?? "improved"}.` : verdict(tb.card)}
        </h1>
      </div>

      <UsefulAsk attemptId={b.id} />

      <section aria-label="Before and after" className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-paper px-[18px] py-4">
          <div className="flex items-baseline justify-between">
            <span className="label-caps">Before</span>
            <span className="text-xl font-extrabold text-muted">{a.total}</span>
          </div>
          <p className="text-[17px] leading-relaxed text-soft-ink">
            <Highlighted text={ta.parent} checks={ta.card.checks} />
          </p>
        </div>
        <div aria-hidden className="flex justify-center">
          <ArrowDown size={22} />
        </div>
        <div className={`flex flex-col gap-2 rounded-2xl bg-white px-[18px] py-4 ${d > 0 ? "shadow-[inset_0_0_0_2px_#2E7D4F]" : ""}`}>
          <div className="flex items-baseline justify-between">
            <span className={`label-caps ${d > 0 ? "text-good" : ""}`}>After</span>
            <span className={`text-xl font-extrabold ${d > 0 ? "text-good" : ""}`}>{b.total}</span>
          </div>
          <p className="text-[17px] leading-[1.75]">
            <Highlighted text={tb.parent} checks={tb.card.checks} />
          </p>
          {gained[0] && <p className="mt-1 text-[15px] text-soft-ink">Biggest change: {gained[0].label.toLowerCase()}.</p>}
          {tb.card.total >= 60 && (
            <div className="mt-1.5">
              <SavePhrase text={tb.parent} scenarioId={b.scenarioId} situation={phraseSituation(b, ownSituation)} score={tb.card.total} />
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-1 rounded-2xl bg-peach px-[18px] py-4">
        <span className="text-[17px] font-bold">Now prove it on your own</span>
        <span className="text-base leading-snug">A new moment: {SCENARIOS[scenarioId].transfer.title.toLowerCase()}. No tips this time.</span>
      </div>

      <button type="button" className="btn-primary h-[58px] text-lg" onClick={onTransfer}>
        Try a new situation <Arrow size={20} />
      </button>

      <Collapsible label="More about this reply" defaultOpen>
        {typeof coach === "object" ? <CoachNotes coach={coach} showChange={b.total < 85} /> : coach === "loading" ? <CoachLoading /> : null}
        <div className="rounded-2xl bg-white p-[18px]">
          <DimensionBars card={tb.card} compare={ta.card} />
          <p className="mt-3 text-xs text-muted">Grey shows your first try.</p>
        </div>
        <CheckList card={tb.card} />
      </Collapsible>
    </div>
  );
}

export function Done({ first, retry, transfer, coach }: { first?: Attempt; retry?: Attempt; transfer: Attempt; coach?: Coach | "loading" }) {
  const t = transfer.turns[0];
  return (
    <div className="flex flex-col gap-[18px] py-6">
      <div className="anim-rise flex flex-col items-center gap-3 text-center">
        <Sam face={faceFor(transfer.outcome)} size={96} />
        <ScoreRing value={transfer.total} size={120} />
        <h1 className="font-display max-w-[340px] text-[28px] leading-tight">
          {transfer.outcome === "going_along" ? "You did it on your own." : "You tried it on your own."}
        </h1>
        <OutcomeChip a={transfer} />
        {first && (
          <p className="text-[17px] text-soft-ink">
            First try <b className="text-ink">{first.total}</b>
            {retry && (
              <>
                , with the tip <b className="text-ink">{retry.total}</b>
              </>
            )}
            , new situation alone <b className="text-ink">{transfer.total}</b>.
          </p>
        )}
      </div>

      {typeof coach === "object" ? <CoachNotes coach={coach} showChange={transfer.total < 85} /> : coach === "loading" ? <CoachLoading /> : <YourWords turn={t} />}
      {typeof coach === "object" && coach.rewrite && transfer.total < 85 && <Improved rewrite={coach.rewrite} attempt={transfer} />}

      <section className="flex flex-col gap-2 rounded-3xl bg-peach p-5">
        <span className="label-caps text-amber-text">For the next hard moment</span>
        <h2 className="text-[24px] font-extrabold leading-tight">Your words are ready when you need them</h2>
        <p className="text-[17px] leading-snug">
          Saved phrases show first in <b>Help me now</b>. When something new happens, practice that exact moment.
        </p>
        <Link href="/help" className="btn-primary mt-1.5 h-14 text-lg">
          Open Help me now <Arrow size={20} />
        </Link>
        <Link href="/progress" className="text-center text-[15px] font-semibold underline underline-offset-[3px]">
          See my phrases and plan
        </Link>
      </section>
      <Link href="/stories" className="btn-ghost">
        Practice another moment
      </Link>

      <Collapsible label="See full breakdown">
        <div className="rounded-2xl bg-white p-[18px]">
          <DimensionBars card={t.card} />
        </div>
        <CheckList card={t.card} />
      </Collapsible>
    </div>
  );
}
