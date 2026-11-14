"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { SCENARIOS, describe, type ScenarioId } from "@/lib/scenarios";
import type { CheckResult, Dimension, Scorecard } from "@/lib/rubric/types";
import { MAX_CHARS } from "@/lib/rubric/validate";
import {
  FOCUS_TIPS,
  buildPlan,
  newId,
  summarize,
  update,
  useStore,
  type Age,
  type Attempt,
  type AttemptKind,
  type Turn,
} from "@/lib/storage";
import {
  CDC_URL,
  CheckList,
  DimensionBars,
  Highlighted,
  Legend,
  ScoreRing,
  Spinner,
  TypingDots,
  findMarks,
} from "@/components/ui";
import { codeCoach, type Coach } from "@/lib/coach";
import type { Crisis } from "@/lib/safety";
import { CrisisCard } from "@/components/CrisisCard";
import { ENDING_STATES, MAX_PARENT_TURNS, STATE_LABEL, type SamState } from "@/lib/toddler";
import { Arrow, ArrowDown, ArrowUp, Back, Check, ChevronDown, Info, ScenarioIcon } from "@/components/icons";


const LINK_ALIASES: Record<string, ScenarioId> = {
  playground: "leaving_playground",
  leaving: "leaving_playground",
  leaving_playground: "leaving_playground",
  bedtime: "bedtime_refusal",
  sleep: "bedtime_refusal",
  bedtime_refusal: "bedtime_refusal",
  hitting: "hitting_sibling",
  siblings: "hitting_sibling",
  hitting_sibling: "hitting_sibling",
};

/** Labeled sample answers behind "Need an idea?". They run through the real scoring. */
const IDEAS: Record<ScenarioId, { first: string; retry: string }> = {
  leaving_playground: {
    first: "You wish we could stay. It's time to go now. Do you want to walk or hop to the car?",
    retry: SCENARIOS.leaving_playground.scripts[0],
  },
  bedtime_refusal: {
    first: "You really want to keep building. It's bedtime now. One book or two songs?",
    retry: SCENARIOS.bedtime_refusal.scripts[0],
  },
  hitting_sibling: {
    first: "I won't let you hit. Hitting hurts. You can stomp your feet or squeeze the pillow.",
    retry: SCENARIOS.hitting_sibling.scripts[0],
  },
  custom: { first: SCENARIOS.custom.scripts[0], retry: SCENARIOS.custom.scripts[1] },
};

const SITUATION: Record<ScenarioId, { main: string; transfer: string }> = {
  leaving_playground: { main: "is on the slide and refuses to leave the playground.", transfer: "is playing with grandma's toys and won't put on shoes to go home." },
  bedtime_refusal: { main: "is building with blocks and refuses to go to bed.", transfer: "won't turn off a cartoon on the tablet before dinner." },
  hitting_sibling: { main: "just hit their baby brother, who grabbed a toy truck. He's crying.", transfer: "pushed a friend at a playdate and grabbed their doll." },
  custom: { main: "", transfer: "is on the slide and refuses to leave the playground." },
};

const STRENGTH: Record<Dimension, string> = {
  clear_direction: "clear",
  calm_respectful: "calm",
  emotional_response: "warm",
  boundaries: "firm",
  positive_guidance: "positive",
};
const NEXT: Record<Dimension, string> = {
  clear_direction: "Try one short direction.",
  calm_respectful: "Try a calmer tone.",
  emotional_response: "Try naming the feeling.",
  boundaries: "Try stating the limit.",
  positive_guidance: "Try offering two choices.",
};

function biggestMiss(card: Scorecard): CheckResult | null {
  const failed = card.checks.filter((c) => !c.passed && c.maxPoints > 0);
  return failed.sort((a, b) => b.maxPoints - b.points - (a.maxPoints - a.points))[0] ?? null;
}

/** One sentence: what went well, then the single next thing to try. Built from the real checks. */
function verdict(card: Scorecard): string {
  const strengths = (Object.keys(STRENGTH) as Dimension[])
    .filter((d) => card.byDimension[d].max > 0 && card.byDimension[d].earned / card.byDimension[d].max >= 0.75)
    .slice(0, 2)
    .map((d) => STRENGTH[d]);
  const miss = biggestMiss(card);
  const head = strengths.length ? strengths.join(" and ") : "";
  const first = card.total < 55 ? "A first try." : head ? head[0].toUpperCase() + head.slice(1) + "." : "A good start.";
  return miss ? `${first} ${NEXT[miss.dimension]}` : `${first} Every check passed.`;
}

type Msg = { role: "child" | "parent"; text: string; card?: Scorecard; state?: SamState };
type Step = "chat" | "score" | "compare" | "done";

export default function PracticePage() {
  const router = useRouter();
  const store = useStore();
  const scenarioId: ScenarioId = store?.current ?? "leaving_playground";
  const age: Age = store?.childAge ?? 3;
  const context = store?.context ?? "";
  const planDay = store?.currentPlanDay ?? null;
  const own = scenarioId === "custom" ? store?.custom : undefined;
  const sex = store?.profile?.sex;
  const temperament = store?.profile?.temperament;
  const child = useMemo(() => (sex || temperament ? { sex, temperament } : undefined), [sex, temperament]);
  const [customOpener, setCustomOpener] = useState<string | null>(null);
  const allowed = Boolean(store?.current && (SCENARIOS[store.current].free || store.unlocked));
  const ready = Boolean(store) && allowed;

  const [step, setStep] = useState<Step>("chat");
  const [kind, setKind] = useState<AttemptKind>("first");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "child", text: "" }]);
  const [results, setResults] = useState<Partial<Record<AttemptKind, Attempt>>>({});
  const [coaches, setCoaches] = useState<Partial<Record<AttemptKind, Coach | "loading">>>({});

  useEffect(() => {
    if (!store) return;
    // Pain-specific links from ads, e.g. /practice?s=bedtime, open straight into that moment.
    const q = new URLSearchParams(window.location.search).get("s");
    if (q) {
      window.history.replaceState(null, "", "/practice");
      const id = LINK_ALIASES[q.toLowerCase()];
      if (id) {
        update((st) => {
          st.current = id;
          st.currentPlanDay = null;
        });
        return;
      }
    }
    if (!store.current) router.replace("/");
    else if (!allowed) router.replace("/pricing?from=" + store.current);
  }, [store, allowed, router]);

  // For the parent's own moment, Sam's first line is written for their situation.
  useEffect(() => {
    if (scenarioId !== "custom" || !own?.situation || customOpener) return;
    let alive = true;
    (async () => {
      let line = SCENARIOS.custom.childOpener;
      try {
        const r = await fetch("/api/opener", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ age, situation: own.situation, child }),
        });
        const d = (await r.json()) as { opener?: string };
        if (d.opener) line = d.opener;
      } catch {}
      if (alive) setCustomOpener(line);
    })();
    return () => {
      alive = false;
    };
  }, [scenarioId, own?.situation, customOpener, age, child]);

  const scenario = SCENARIOS[scenarioId];
  const transfer = kind === "transfer";
  const title = transfer ? scenario.transfer.title : scenario.short;
  const openerFor = (t: boolean) => (scenarioId === "custom" && !t ? (customOpener ?? "…") : describe(scenarioId, t).childOpener);
  // The opener depends on the scenario, which is known only after the store loads.
  const shown = msgs.length === 1 && !msgs[0].text ? [{ role: "child" as const, text: openerFor(false) }] : msgs;

  function startChat(k: AttemptKind) {
    setKind(k);
    setMsgs([{ role: "child", text: openerFor(k === "transfer") }]);
    setStep("chat");
    window.scrollTo({ top: 0 });
  }

  function finishAttempt() {
    const turns: Turn[] = [];
    shown.forEach((m, i) => {
      if (m.role === "parent" && m.card) {
        const next = shown[i + 1];
        turns.push({
          parent: m.text,
          child: next?.role === "child" ? next.text : null,
          card: m.card,
          ...(next?.role === "child" && next.state ? { state: next.state } : {}),
        });
      }
    });
    if (!turns.length) return;
    const { total, byDimension } = summarize(turns);
    const lastState = [...shown].reverse().find((m) => m.role === "child" && m.state)?.state;
    const attempt: Attempt = {
      outcome: lastState ?? "resisting",
      id: newId(),
      scenarioId,
      kind,
      turns,
      total,
      byDimension,
      createdAt: new Date().toISOString(),
      ...(planDay ? { planDay } : {}),
    };
    setResults((r) => ({ ...r, [kind]: attempt }));
    update((s) => {
      s.attempts = [...s.attempts, attempt].slice(-100);
      // Keep the plan aimed at the current weakest skill until the parent starts working through it.
      if (!s.plan.some((p) => p.done)) s.plan = buildPlan(s.attempts);
      if (planDay && kind === "first") {
        s.plan = s.plan.map((p) => (p.day === planDay ? { ...p, done: true } : p));
        s.currentPlanDay = null;
      }
    });
    setStep(kind === "first" ? "score" : kind === "retry" ? "compare" : "done");
    window.scrollTo({ top: 0 });
    loadCoach(kind, turns);
  }

  /** Asks the coach to read the whole conversation. Falls back to the code coach in the browser. */
  async function loadCoach(k: AttemptKind, turns: Turn[]) {
    const input = { scenarioId, transfer: k === "transfer", age, turns, situation: own?.situation };
    setCoaches((c) => ({ ...c, [k]: "loading" }));
    let result: Coach;
    try {
      const r = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!r.ok) throw new Error(String(r.status));
      result = (await r.json()) as Coach;
    } catch {
      result = codeCoach(input);
    }
    setCoaches((c) => ({ ...c, [k]: result }));
  }

  if (!ready)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner label="Loading…" />
      </div>
    );

  const tip = results.first ? biggestMiss(results.first.turns[0].card) : null;
  const firstCoach = typeof coaches.first === "object" ? coaches.first : null;

  return (
    <div className="-mx-5 flex min-h-[100dvh] flex-col">
      <PracticeHeader title={title} step={step} kind={kind} />

      <div className="mx-auto w-full max-w-xl flex-1 px-4 sm:px-5">
        {step === "chat" && (
          <Chat
            key={`${scenarioId}-${kind}`}
            scenarioId={scenarioId}
            age={age}
            context={context}
            transfer={transfer}
            situation={
              scenarioId === "custom" && !transfer
                ? (own?.situation ?? "Your own moment")
                : `Your ${age} year old ${transfer ? SITUATION[scenarioId].transfer : SITUATION[scenarioId].main}`
            }
            ownSituation={scenarioId === "custom" && !transfer ? own?.situation : undefined}
            child={child}
            initialText={kind === "first" && scenarioId === "custom" ? own?.said : undefined}
            banner={
              kind === "retry" && firstCoach
                ? {
                    label: "Your tip",
                    text: firstCoach.change.quote
                      ? `Instead of "${firstCoach.change.quote}": ${firstCoach.change.why.charAt(0).toLowerCase()}${firstCoach.change.why.slice(1)}`
                      : firstCoach.change.why,
                  }
                : kind === "retry" && tip
                ? { label: "Your tip", text: FOCUS_TIPS[tip.dimension] }
                : transfer
                  ? { label: "On your own", text: "A new moment. No tips this time." }
                  : kind === "first" && scenarioId === "custom" && own?.said
                    ? { label: "Today I lost it", text: "Your words are ready below. Send them to see how Sam reacts, then we'll find a better way together." }
                    : null
            }
            msgs={shown}
            setMsgs={setMsgs}
            idea={
              kind === "first" ? IDEAS[scenarioId].first : kind === "retry" ? (firstCoach?.rewrite?.text ?? IDEAS[scenarioId].retry) : null
            }
            ideaLabel={kind === "retry" && firstCoach?.rewrite ? "Your words, improved" : "One idea (sample)"}
            onFinish={finishAttempt}
          />
        )}

        {step === "score" && results.first && (
          <AttemptScore attempt={results.first} coach={coaches.first} onRetry={() => startChat("retry")} />
        )}

        {step === "compare" && results.first && results.retry && (
          <Compare a={results.first} b={results.retry} coach={coaches.retry} scenarioId={scenarioId} onTransfer={() => startChat("transfer")} />
        )}

        {step === "done" && results.transfer && (
          <Done first={results.first} retry={results.retry} transfer={results.transfer} coach={coaches.transfer} />
        )}
      </div>
    </div>
  );
}

function PracticeHeader({ title, step, kind }: { title: string; step: Step; kind: AttemptKind }) {
  const active = step === "chat" ? (kind === "first" ? 0 : kind === "retry" ? 1 : 2) : step === "score" ? 1 : step === "compare" ? 2 : 3;
  const labels = ["Try", "Improve", "New situation"];
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream px-4 pb-3.5 pt-3">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Back to home" className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
            <Back size={20} />
          </Link>
          <span className="truncate px-2 text-[17px] font-bold">{title}</span>
          <span className="w-11" />
        </div>
        <ol
          className="mt-3.5 grid grid-cols-3 gap-1.5"
          aria-label={active > 2 ? "All 3 steps done" : `Step ${active + 1} of 3, ${labels[active]}`}
        >
          {labels.map((l, i) => {
            const done = i < active;
            const now = i === active;
            return (
              <li key={l} className="flex flex-col gap-1.5">
                <span className={`h-1.5 rounded-full ${done ? "bg-ink" : now ? "bg-orange" : "bg-line"}`} />
                <span className={`flex items-center gap-1 text-[13px] ${now ? "font-extrabold" : done ? "font-semibold" : "font-medium text-muted"}`}>
                  {done ? <Check size={13} /> : `${i + 1}`} {l}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </header>
  );
}

const STATE_DOT: Record<SamState, string> = {
  going_along: "bg-good-line",
  resisting: "bg-orange",
  meltdown: "bg-red",
  gave_in: "bg-muted",
};

const OUTCOME: Record<SamState, { title: string; text: string; tone: string }> = {
  going_along: { title: "You did it. Sam is coming along.", text: "Your words calmed the moment. See which ones worked.", tone: "bg-good-soft" },
  meltdown: { title: "Sam melted down.", text: "That happens, even to great parents. Let's see what to change.", tone: "bg-bad-soft" },
  gave_in: { title: "Sam got their way.", text: "Sam is happy for now, but the limit moved, so this moment will come back.", tone: "bg-peach" },
  resisting: { title: "Sam is still upset.", text: "Real moments can take a while. Let's see what would help most.", tone: "bg-peach" },
};

function SamBubble({ text, typing = false, state }: { text?: string; typing?: boolean; state?: SamState }) {
  return (
    <div className="flex max-w-[86%] items-end gap-2">
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange text-[15px] font-extrabold">
        S
      </span>
      <div className="flex flex-col gap-1">
        {!typing && <span className="pl-1 text-[13px] text-muted">Sam</span>}
        {typing ? (
          <div role="status" aria-label="Sam is typing" className="rounded-[18px] rounded-bl-md bg-peach px-[18px] py-4">
            <TypingDots />
          </div>
        ) : (
          <p className="rounded-[18px] rounded-bl-md bg-peach px-[15px] py-3 text-[17px] leading-snug">{text}</p>
        )}
        {state && (
          <span className="flex items-center gap-1.5 pl-1 text-[13px] font-semibold text-soft-ink">
            <span aria-hidden className={`h-2 w-2 rounded-full ${STATE_DOT[state]}`} />
            Sam: {STATE_LABEL[state].toLowerCase()}
          </span>
        )}
      </div>
    </div>
  );
}

function Chat(props: {
  scenarioId: ScenarioId;
  age: Age;
  context: string;
  transfer: boolean;
  situation: string;
  banner: { label: string; text: string } | null;
  msgs: Msg[];
  setMsgs: React.Dispatch<React.SetStateAction<Msg[]>>;
  idea: string | null;
  ideaLabel: string;
  onFinish: () => void;
  ownSituation?: string;
  child?: { sex?: "boy" | "girl" | "unsaid"; temperament?: "calm" | "active" | "fiery" | "sensitive" };
  initialText?: string;
}) {
  const { scenarioId, age, context, transfer, situation, banner, msgs, setMsgs, idea, ideaLabel, onFinish, ownSituation, child, initialText } = props;
  const [text, setText] = useState(initialText ?? "");
  const [busy, setBusy] = useState<"" | "score" | "child">("");
  const [error, setError] = useState("");
  const [showIdea, setShowIdea] = useState(false);
  const [pending, setPending] = useState("");
  const [crisis, setCrisis] = useState<Crisis["kind"] | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const parentTurns = msgs.filter((m) => m.role === "parent").length;
  const lastState = [...msgs].reverse().find((m) => m.role === "child" && m.state)?.state;
  const ended = !busy && parentTurns > 0 && ((lastState && ENDING_STATES.includes(lastState)) || parentTurns >= MAX_PARENT_TURNS);
  const outcome = OUTCOME[lastState ?? "resisting"];
  const canType = !ended && parentTurns < MAX_PARENT_TURNS;

  // Keep the newest message in view, including after the ending card appears in the footer.
  useEffect(() => {
    const id = requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
    return () => cancelAnimationFrame(id);
  }, [msgs.length, busy, ended]);



  async function send() {
    const t = text.trim();
    if (!t || !canType || busy) return;
    setError("");
    setShowIdea(false);
    setPending(t);
    setBusy("score");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId, age, text: t, transfer, situation: ownSituation }),
      });
      const data = await res.json();
      if (data.crisis) {
        setCrisis(data.crisis as Crisis["kind"]);
        window.scrollTo({ top: 0 });
        setBusy("");
        setPending("");
        setText("");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setBusy("");
        setPending("");
        return;
      }
      const next: Msg[] = [...msgs, { role: "parent", text: t, card: data as Scorecard }];
      setMsgs(next);
      setText("");
      setPending("");
      setBusy("child");
      const history = next.map((m) => ({ role: m.role === "child" ? "assistant" : "user", content: m.text }));
      const r = await fetch("/api/toddler", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId,
          age,
          transfer,
          context,
          history,
          situation: ownSituation,
          child,
          passed: Object.fromEntries((data as Scorecard).checks.map((c) => [c.id, c.passed])),
        }),
      });
      const d = r.ok ? ((await r.json()) as { reply: string; state: SamState }) : { reply: "Hmph.", state: "resisting" as SamState };
      setMsgs((m) => [...m, { role: "child", text: d.reply, state: d.state }]);
    } catch {
      setError("Connection problem. Check your internet and try again.");
      setPending("");
    } finally {
      setBusy("");
    }
  }

  if (crisis)
    return (
      <div className="py-4">
        <CrisisCard kind={crisis} />
      </div>
    );

  return (
    <div className="flex min-h-[calc(100dvh-118px)] flex-col">
      <div className="flex flex-1 flex-col gap-3.5 py-4">
        <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3.5">
          <span className="mt-px shrink-0">
            <ScenarioIcon id={scenarioId} size={22} />
          </span>
          <p className="text-[17px] font-semibold leading-snug">{situation}</p>
        </div>

        {banner && (
          <div className="rounded-2xl bg-peach px-4 py-3">
            <span className="label-caps text-ink">{banner.label}</span>
            <p className="mt-1 text-base font-semibold leading-snug">{banner.text}</p>
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === "child" ? (
            <SamBubble key={i} text={m.text} state={m.state} />
          ) : (
            <div key={i} className="flex max-w-[86%] flex-col items-end gap-1 self-end">
              <span className="pr-1 text-[13px] text-muted">You</span>
              <p className="rounded-[18px] rounded-br-md bg-ink px-[15px] py-3 text-[17px] leading-snug text-cream">{m.text}</p>
            </div>
          ),
        )}

        {busy === "score" && pending && (
          <>
            <div className="flex max-w-[86%] flex-col items-end gap-1 self-end opacity-70">
              <span className="pr-1 text-[13px] text-muted">You</span>
              <p className="rounded-[18px] rounded-br-md bg-ink px-[15px] py-3 text-[17px] leading-snug text-cream">{pending}</p>
            </div>
            <p role="status" className="flex items-center justify-end gap-2 text-sm text-muted">
              <Spinner /> Reading your words
            </p>
          </>
        )}

        {busy === "child" && (
          <>
            <SamBubble typing />
            <p className="-mt-2 ml-10 text-sm text-muted">Sam is thinking about it…</p>
          </>
        )}

        {showIdea && idea && (
          <div className="mt-auto flex flex-col gap-2.5 rounded-2xl border border-line bg-paper px-4 py-3.5">
            <span className="label-caps">{ideaLabel}</span>
            <p className="text-[17px] leading-relaxed">&ldquo;{idea}&rdquo;</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-orange"
                onClick={() => {
                  setText(idea);
                  setShowIdea(false);
                }}
              >
                Use this
              </button>
              <button type="button" className="min-h-11 rounded-full px-3.5 text-[15px] font-semibold" onClick={() => setShowIdea(false)}>
                Hide
              </button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <footer className="sticky bottom-0 -mx-4 border-t border-line bg-white px-4 pb-3 pt-2.5 sm:mx-0 sm:rounded-t-2xl sm:border-x">
        {ended && (
          <div role="status" className={`mb-2.5 rounded-2xl px-4 py-3 ${outcome.tone}`}>
            <p className="text-[17px] font-extrabold">{outcome.title}</p>
            <p className="mt-0.5 text-[15px] leading-snug text-soft-ink">{outcome.text}</p>
          </div>
        )}
        {ended && (
          <button type="button" className="btn-primary mb-1 h-14 w-full text-lg" onClick={onFinish}>
            See my score <Arrow size={20} />
          </button>
        )}
        {canType && (
          <>
            <div className="flex min-h-6 items-center justify-between">
              {idea && parentTurns === 0 && !showIdea ? (
                <button type="button" onClick={() => setShowIdea(true)} className="h-8 text-[15px] font-semibold underline underline-offset-[3px]">
                  Need an idea?
                </button>
              ) : (
                parentTurns > 0 && !busy ? (
                  <button type="button" onClick={onFinish} className="h-8 text-[15px] font-semibold underline underline-offset-[3px]">
                    Stop here, see my score
                  </button>
                ) : (
                  <span />
                )
              )}
              {text.length < 320 && parentTurns > 0 && (
                <span className="text-[13px] text-muted">
                  Reply {parentTurns + 1} of {MAX_PARENT_TURNS}
                </span>
              )}
              {text.length >= 320 && (
                <span aria-live="polite" className={`text-[13px] font-semibold ${text.length >= 390 ? "text-ink" : "text-muted"}`}>
                  {text.length} / {MAX_CHARS}
                </span>
              )}
            </div>
            {error && <p className="mt-1 text-sm font-semibold text-bad">{error}</p>}
            <div className="mt-1.5 flex items-end gap-2.5">
              <label htmlFor="reply" className="sr-only">
                What would you say?
              </label>
              <textarea
                id="reply"
                rows={2}
                value={text}
                maxLength={MAX_CHARS}
                disabled={busy !== ""}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={busy === "child" ? "Wait for Sam…" : parentTurns === 0 ? "What would you say?" : "What do you say next?"}
                className="max-h-32 min-h-[52px] flex-1 resize-none rounded-2xl border-[1.5px] border-field bg-cream px-3.5 py-3 text-[17px] leading-snug outline-none placeholder:text-[#6B6960] focus:border-ink disabled:border-line disabled:bg-[#F7F6EE]"
              />
              <button
                type="button"
                aria-label="Send"
                onClick={send}
                disabled={!text.trim() || busy !== ""}
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-ink text-cream transition disabled:bg-field disabled:text-ink"
              >
                {busy === "score" ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-cream border-t-transparent" /> : <ArrowUp size={22} />}
              </button>
            </div>
          </>
        )}
        <p className="mt-2 text-center text-xs text-muted">Sam is a practice character. Real children respond differently.</p>
      </footer>
    </div>
  );
}

function outcomeLine(a: Attempt): string | null {
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

function OutcomeChip({ a }: { a: Attempt }) {
  const line = outcomeLine(a);
  if (!line || !a.outcome) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[15px] font-semibold">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${STATE_DOT[a.outcome]}`} />
      {line}
    </span>
  );
}

function Collapsible({ label, children, defaultOpen = false }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
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
      {open && <div className="space-y-4 pb-2 pt-1">{children}</div>}
    </section>
  );
}

function YourWords({ turn }: { turn: Turn }) {
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
        <div aria-live="polite" className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 ${m.good ? "bg-[#E6F1EA]" : "bg-bad-soft"}`}>
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

function BiggestWin({ card }: { card: Scorecard }) {
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
function DiffText({ from, to }: { from: string; to: string }) {
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");
  const had = new Set(from.split(/\s+/).map(norm).filter(Boolean));
  const tokens = to.split(/(\s+)/);
  return (
    <>
      {tokens.map((tok, i) =>
        /^\s+$/.test(tok) || had.has(norm(tok)) ? (
          <Fragment key={i}>{tok}</Fragment>
        ) : (
          <mark key={i} className="good">
            {tok}
          </mark>
        ),
      )}
    </>
  );
}

function CoachLoading() {
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
function CoachNotes({ coach, showChange = true }: { coach: Coach; showChange?: boolean }) {
  return (
    <section aria-label="Your coach" className="flex flex-col gap-4 rounded-2xl bg-white p-[18px]">
      <div>
        <span className="label-caps">What happened</span>
        <p className="mt-1.5 text-[18px] font-semibold leading-snug">{coach.summary}</p>
      </div>
      {coach.keep && (
        <div className="flex gap-3">
          <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-good-line" />
          <p className="text-base leading-snug">
            <b>Keep</b> <span className="rounded bg-good-soft px-1">&ldquo;{coach.keep.quote}&rdquo;</span> {coach.keep.why}
          </p>
        </div>
      )}
      {showChange && (
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
      {coach.heard && (
        <div className="flex items-start gap-2.5 border-t border-line pt-3.5">
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

function Improved({ rewrite }: { rewrite: NonNullable<Coach["rewrite"]> }) {
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
    </section>
  );
}

function AttemptScore({ attempt, coach, onRetry }: { attempt: Attempt; coach?: Coach | "loading"; onRetry: () => void }) {
  const [turnIdx, setTurnIdx] = useState(() =>
    attempt.turns.reduce((worst, t, i, arr) => (t.card.total < arr[worst].card.total ? i : worst), 0),
  );
  const t = attempt.turns[turnIdx];
  const c = typeof coach === "object" ? coach : null;
  return (
    <div className="flex flex-col gap-[18px] py-6">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <ScoreRing value={attempt.total} />
        <OutcomeChip a={attempt} />
        <h1 className="max-w-[320px] text-[26px] font-extrabold leading-tight tracking-[-0.015em]">{verdict(t.card)}</h1>
        {attempt.turns.length > 1 && <p className="-mt-2 text-sm text-muted">Average of your {attempt.turns.length} replies</p>}
      </div>

      {c ? <CoachNotes coach={c} /> : coach === "loading" ? <CoachLoading /> : <BiggestWin card={t.card} />}
      {c?.rewrite && <Improved rewrite={c.rewrite} />}

      <button type="button" className="btn-primary h-[58px] text-lg" onClick={onRetry}>
        Try again in your own words <Arrow size={20} />
      </button>

      <Collapsible label="See every phrase and check">
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

function Compare({
  a,
  b,
  coach,
  scenarioId,
  onTransfer,
}: {
  a: Attempt;
  b: Attempt;
  coach?: Coach | "loading";
  scenarioId: ScenarioId;
  onTransfer: () => void;
}) {
  const ta = a.turns[0];
  const tb = b.turns[0];
  const d = b.total - a.total;
  const gained = tb.card.checks
    .filter((c) => c.passed && !ta.card.checks.find((x) => x.id === c.id)?.passed)
    .sort((x, y) => y.maxPoints - x.maxPoints);
  return (
    <div className="flex flex-col gap-[18px] py-6">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <ScoreRing value={b.total} />
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-base font-extrabold ${
            d > 0 ? "bg-good-soft text-good" : d < 0 ? "bg-bad-soft text-bad" : "bg-white text-ink"
          }`}
        >
          {d > 0 && <ArrowUp size={16} />}
          {d === 0 ? "Same as your first try" : `${d > 0 ? "+" : "−"}${Math.abs(d)} from your first try`}
        </span>
        <OutcomeChip a={b} />
        <h1 className="max-w-[320px] text-[26px] font-extrabold leading-tight tracking-[-0.015em]">{verdict(tb.card)}</h1>
      </div>

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
        </div>
      </section>

      {typeof coach === "object" ? <CoachNotes coach={coach} showChange={b.total < 85} /> : coach === "loading" ? <CoachLoading /> : null}

      <div className="flex flex-col gap-1 rounded-2xl bg-peach px-[18px] py-4">
        <span className="text-[17px] font-bold">Now prove it on your own</span>
        <span className="text-base leading-snug">A new moment: {SCENARIOS[scenarioId].transfer.title.toLowerCase()}. No tips this time.</span>
      </div>

      <button type="button" className="btn-primary h-[58px] text-lg" onClick={onTransfer}>
        Try a new situation <Arrow size={20} />
      </button>

      <Collapsible label="See full breakdown">
        <div className="rounded-2xl bg-white p-[18px]">
          <DimensionBars card={tb.card} compare={ta.card} />
          <p className="mt-3 text-xs text-muted">Grey shows your first try.</p>
        </div>
        <CheckList card={tb.card} />
      </Collapsible>
    </div>
  );
}

function Done({ first, retry, transfer, coach }: { first?: Attempt; retry?: Attempt; transfer: Attempt; coach?: Coach | "loading" }) {
  const t = transfer.turns[0];
  return (
    <div className="flex flex-col gap-[18px] py-6">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <ScoreRing value={transfer.total} />
        <h1 className="max-w-[340px] text-[26px] font-extrabold leading-tight tracking-[-0.015em]">
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
      {typeof coach === "object" && coach.rewrite && transfer.total < 85 && <Improved rewrite={coach.rewrite} />}

      <section className="flex flex-col gap-2 rounded-2xl bg-orange p-5">
        <span className="text-sm font-extrabold uppercase tracking-[0.04em]">Keep it going</span>
        <h2 className="text-[24px] font-extrabold leading-tight">One short practice a day</h2>
        <p className="text-[17px] leading-snug">Your 7 day plan targets your weakest skill. Day 1 is free.</p>
        <Link href="/progress" className="btn-primary mt-1.5 h-14 text-lg">
          See my plan <Arrow size={20} />
        </Link>
      </section>
      <Link href="/" className="btn-ghost">
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
