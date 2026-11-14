"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SCENARIOS, describe, type ScenarioId } from "@/lib/scenarios";
import { buildScorecard } from "@/lib/rubric/score";
import type { Scorecard } from "@/lib/rubric/types";
import { MAX_CHARS } from "@/lib/rubric/validate";
import {
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
import { DimensionBars, Highlighted, ScoreRing, ScorecardView, Spinner, scoreTone } from "@/components/ui";

const MAX_PARENT_TURNS = 2;

const SAMPLES: Record<ScenarioId, { weak: string; better: string }> = {
  leaving_playground: {
    weak: "Come on, we're leaving NOW! Stop it!",
    better: "You wish we could stay. It's time to go now. Do you want to walk or hop to the car?",
  },
  bedtime_refusal: {
    weak: "Can you go to bed please? Stop arguing!",
    better: "You really want to keep building. It's bedtime now. One book or two songs?",
  },
  hitting_sibling: {
    weak: "Stop hitting! Bad boy!",
    better: "I won't let you hit. Hitting hurts. You can stomp your feet or squeeze the pillow.",
  },
};

type Msg = { role: "child" | "parent"; text: string; card?: Scorecard };
type Step = "script" | "chat" | "score" | "compare" | "done";

export default function PracticePage() {
  const router = useRouter();
  const store = useStore();
  const scenarioId: ScenarioId = store?.current ?? "leaving_playground";
  const age: Age = store?.childAge ?? 3;
  const context = store?.context ?? "";
  const planDay = store?.currentPlanDay ?? null;
  const allowed = Boolean(store?.current && (SCENARIOS[store.current].free || store.unlocked));
  const ready = Boolean(store) && allowed;

  const [step, setStep] = useState<Step>("script");
  const [kind, setKind] = useState<AttemptKind>("first");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [results, setResults] = useState<Partial<Record<AttemptKind, Attempt>>>({});

  useEffect(() => {
    if (!store) return;
    if (!store.current) router.replace("/");
    else if (!allowed) router.replace("/pricing?from=" + store.current);
  }, [store, allowed, router]);

  const scenario = SCENARIOS[scenarioId];
  const situation = describe(scenarioId, kind === "transfer");

  function startChat(k: AttemptKind) {
    setKind(k);
    setMsgs([{ role: "child", text: describe(scenarioId, k === "transfer").childOpener }]);
    setStep("chat");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishAttempt() {
    const turns: Turn[] = [];
    msgs.forEach((m, i) => {
      if (m.role === "parent" && m.card) {
        const next = msgs[i + 1];
        turns.push({ parent: m.text, child: next?.role === "child" ? next.text : null, card: m.card });
      }
    });
    if (!turns.length) return;
    const { total, byDimension } = summarize(turns);
    const attempt: Attempt = {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!ready) return <Spinner label="Loading…" />;

  return (
    <div className="space-y-5">
      <Progress step={step} kind={kind} />
      <div>
        <p className="text-sm font-semibold text-calm">
          {kind === "transfer" ? "New situation, on your own" : scenario.title} · age {age}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {step === "script" && "First, read what could work"}
          {step === "chat" && (kind === "first" ? "Now say it your way" : kind === "retry" ? "Try it again" : situation.title)}
          {step === "score" && "Your scorecard"}
          {step === "compare" && "What changed"}
          {step === "done" && "You did it on your own"}
        </h1>
      </div>

      {step === "script" && <ScriptStep scenarioId={scenarioId} onNext={() => startChat("first")} />}

      {step === "chat" && (
        <Chat
          key={kind}
          scenarioId={scenarioId}
          age={age}
          context={context}
          transfer={kind === "transfer"}
          description={situation.description}
          msgs={msgs}
          setMsgs={setMsgs}
          sample={kind === "first" ? SAMPLES[scenarioId].weak : kind === "retry" ? SAMPLES[scenarioId].better : null}
          sampleLabel={kind === "retry" ? "Try a sample better answer" : "Try a sample answer"}
          showScriptPeek={kind === "retry"}
          onFinish={finishAttempt}
        />
      )}

      {step === "score" && results.first && (
        <AttemptScore attempt={results.first} onRetry={() => startChat("retry")} />
      )}

      {step === "compare" && results.first && results.retry && (
        <Compare a={results.first} b={results.retry} onTransfer={() => startChat("transfer")} scenarioId={scenarioId} />
      )}

      {step === "done" && results.transfer && (
        <Done first={results.first} retry={results.retry} transfer={results.transfer} scenarioId={scenarioId} />
      )}
    </div>
  );
}

function Progress({ step, kind }: { step: Step; kind: AttemptKind }) {
  const stage =
    step === "script" ? 0 : kind === "first" && step === "chat" ? 1 : step === "score" ? 2 : kind === "retry" && step === "chat" ? 3 : step === "compare" ? 3 : kind === "transfer" && step === "chat" ? 4 : 5;
  const labels = ["Script", "Practice", "Score", "Retry", "On your own"];
  return (
    <ol className="flex gap-1" aria-label="Progress">
      {labels.map((l, i) => (
        <li key={l} className="flex-1">
          <div className={`h-1.5 rounded-full ${i <= stage ? "bg-calm" : "bg-[#e6dfd3]"}`} />
          <span className={`mt-1 hidden text-[11px] sm:block ${i <= stage ? "text-calm" : "text-muted"}`}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

function ScriptStep({ scenarioId, onNext }: { scenarioId: ScenarioId; onNext: () => void }) {
  const s = SCENARIOS[scenarioId];
  // The script is scored by the same code checks, live, so the tags are real.
  const tagged = useMemo(
    () =>
      s.scripts.map((text) => {
        const card = buildScorecard(text, scenarioId, null, true);
        return { text, card, tags: card.checks.filter((c) => c.passed && c.evidence).slice(0, 4) };
      }),
    [s, scenarioId],
  );
  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-sm text-muted">The situation</p>
        <p className="mt-1">{s.description}</p>
        <ChildBubble text={s.childOpener} />
      </div>
      {tagged.map(({ text, card, tags }, i) => (
        <div key={i} className="card">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-calm">Example script {i + 1}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreTone(card.total).bg} ${scoreTone(card.total).text}`}>
              scores {card.total}
            </span>
          </div>
          <p className="mt-2 text-[17px] leading-relaxed">
            &ldquo;
            <Highlighted text={text} checks={card.checks} />
            &rdquo;
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t.id} className="rounded-full bg-good-soft px-2.5 py-1 text-xs text-good">
                ✓ {t.label}
              </span>
            ))}
          </div>
        </div>
      ))}
      <p className="text-sm text-muted">
        Written from CDC guidance: be specific, state it rather than ask, say what to do instead, and offer two choices. You
        don&apos;t have to copy it. Use your own words.
      </p>
      <button className="btn-primary w-full sm:w-auto" onClick={onNext}>
        I&apos;m ready to practice
      </button>
    </div>
  );
}

function ChildBubble({ text, typing = false }: { text?: string; typing?: boolean }) {
  return (
    <div className="mt-3 flex items-end gap-2">
      <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sun-soft text-lg">
        🧒
      </span>
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-sun-soft px-4 py-2.5 text-[15px]">
        {typing ? <span className="animate-pulse text-muted">Sam is thinking…</span> : text}
      </div>
    </div>
  );
}

function Chat(props: {
  scenarioId: ScenarioId;
  age: Age;
  context: string;
  transfer: boolean;
  description: string;
  msgs: Msg[];
  setMsgs: React.Dispatch<React.SetStateAction<Msg[]>>;
  sample: string | null;
  sampleLabel: string;
  showScriptPeek: boolean;
  onFinish: () => void;
}) {
  const { scenarioId, age, context, transfer, description, msgs, setMsgs, sample, sampleLabel, showScriptPeek, onFinish } = props;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"" | "score" | "child">("");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const parentTurns = msgs.filter((m) => m.role === "parent").length;
  const canSend = parentTurns < MAX_PARENT_TURNS && busy !== "child";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, busy]);

  async function send() {
    const t = text.trim();
    if (!t || !canSend || busy) return;
    setError("");
    setBusy("score");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId, age, text: t, transfer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setBusy("");
        return;
      }
      const next: Msg[] = [...msgs, { role: "parent", text: t, card: data as Scorecard }];
      setMsgs(next);
      setText("");
      setBusy("child");
      const history = next.map((m) => ({ role: m.role === "child" ? "assistant" : "user", content: m.text }));
      const r = await fetch("/api/toddler", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId, age, transfer, context, history }),
      });
      const reply = r.ok ? ((await r.json()).reply as string) : "Hmph.";
      setMsgs((m) => [...m, { role: "child", text: reply }]);
    } catch {
      setError("Connection problem. Check your internet and try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-sm text-muted">{description}</p>
        {showScriptPeek && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-calm">Peek at the script</summary>
            <p className="mt-1 italic">&ldquo;{SCENARIOS[scenarioId].scripts[0]}&rdquo;</p>
          </details>
        )}
        <div className="mt-2 space-y-1">
          {msgs.map((m, i) =>
            m.role === "child" ? (
              <ChildBubble key={i} text={m.text} />
            ) : (
              <div key={i} className="mt-3 flex justify-end">
                <div className="max-w-[80%]">
                  <div className="rounded-2xl rounded-br-sm bg-calm px-4 py-2.5 text-[15px] text-white">{m.text}</div>
                  {m.card && (
                    <p className="mt-1 text-right text-xs text-muted">
                      scored <b className={scoreTone(m.card.total).text}>{m.card.total}</b>
                    </p>
                  )}
                </div>
              </div>
            ),
          )}
          {busy === "child" && <ChildBubble typing />}
          <div ref={endRef} />
        </div>
        <p className="mt-4 text-[11px] text-muted">Practice character. Real children respond differently.</p>
      </div>

      {canSend ? (
        <div className="card space-y-3">
          <label htmlFor="say" className="text-sm font-semibold">
            {parentTurns === 0 ? "What would you say?" : "Sam pushed back. What do you say next?"}
          </label>
          <textarea
            id="say"
            value={text}
            maxLength={MAX_CHARS}
            rows={3}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type it the way you'd really say it…"
            className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-[15px] outline-none focus:border-calm"
          />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{error ? <span className="text-bad">{error}</span> : "English only for now."}</span>
            <span>
              {text.length}/{MAX_CHARS}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={send} disabled={!text.trim() || busy !== ""}>
              {busy === "score" ? <Spinner /> : "Say it"}
            </button>
            {sample && parentTurns === 0 && (
              <button className="btn-ghost" onClick={() => setText(sample)} title="Fills in a labeled sample. It runs through the real scoring.">
                {sampleLabel} <span className="text-xs font-normal text-muted">(sample)</span>
              </button>
            )}
            {parentTurns > 0 && !busy && (
              <button className="btn-ghost" onClick={onFinish}>
                See my score
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          {busy ? (
            <Spinner label="Sam is thinking…" />
          ) : (
            <button className="btn-primary" onClick={onFinish}>
              See my score
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AttemptScore({ attempt, onRetry }: { attempt: Attempt; onRetry: () => void }) {
  const [turn, setTurn] = useState(() =>
    attempt.turns.reduce((worst, t, i, arr) => (t.card.total < arr[worst].card.total ? i : worst), 0),
  );
  const t = attempt.turns[turn];
  const failed = t.card.checks.filter((c) => !c.passed);
  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-5">
        <ScoreRing value={attempt.total} label={scoreTone(attempt.total).label} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {attempt.turns.length > 1 ? "Average across your replies" : "Your first try"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {failed.length
              ? `Biggest win available: ${failed.sort((a, b) => b.maxPoints - a.maxPoints)[0].label.toLowerCase()}.`
              : "Every check passed. Try the harder retry anyway."}
          </p>
        </div>
      </div>
      {attempt.turns.length > 1 && (
        <div className="flex gap-2">
          {attempt.turns.map((x, i) => (
            <button key={i} className="chip" aria-pressed={turn === i} onClick={() => setTurn(i)}>
              Reply {i + 1} · {x.card.total}
            </button>
          ))}
        </div>
      )}
      <div className="card">
        <DimensionBars card={t.card} />
      </div>
      <ScorecardView card={t.card} text={t.parent} />
      <div className="sticky bottom-3 flex justify-end">
        <button className="btn-primary shadow-lg" onClick={onRetry}>
          Try again with what you learned
        </button>
      </div>
    </div>
  );
}

function Delta({ from, to }: { from: number; to: number }) {
  const d = to - from;
  return (
    <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${d > 0 ? "bg-good-soft text-good" : d < 0 ? "bg-bad-soft text-bad" : "bg-cream text-muted"}`}>
      {d > 0 ? "+" : ""}
      {d}
    </span>
  );
}

function SideBySide({ a, b, la, lb }: { a: Attempt; b: Attempt; la: string; lb: string }) {
  const ta = a.turns[0];
  const tb = b.turns[0];
  const gained = tb.card.checks.filter((c) => c.passed && !ta.card.checks.find((x) => x.id === c.id)?.passed);
  const lost = tb.card.checks.filter((c) => !c.passed && ta.card.checks.find((x) => x.id === c.id)?.passed);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          [la, ta, a.total],
          [lb, tb, b.total],
        ].map(([label, t, total]) => (
          <div key={label as string} className="card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted">{label as string}</p>
              <span className={`text-2xl font-bold ${scoreTone(total as number).text}`}>{total as number}</span>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed">
              <Highlighted text={(t as Turn).parent} checks={(t as Turn).card.checks} />
            </p>
          </div>
        ))}
      </div>
      {(gained.length > 0 || lost.length > 0) && (
        <div className="card">
          <p className="font-semibold">The words that made the difference</p>
          <ul className="mt-2 space-y-2 text-sm">
            {gained.map((c) => (
              <li key={c.id} className="flex gap-2">
                <span className="w-9 shrink-0 font-semibold text-good">+{c.maxPoints}</span>
                <span>
                  <b>{c.label}</b>
                  {c.evidence && <span className="italic text-good"> &ldquo;{c.evidence}&rdquo;</span>}
                </span>
              </li>
            ))}
            {lost.map((c) => (
              <li key={c.id} className="flex gap-2">
                <span className="w-9 shrink-0 font-semibold text-bad">−{c.maxPoints}</span>
                <span>
                  <b>{c.label}</b>
                  {c.evidence && <span className="italic text-bad"> &ldquo;{c.evidence}&rdquo;</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card">
        <DimensionBars card={tb.card} compare={ta.card} />
        <p className="mt-3 text-xs text-muted">Grey shows your earlier attempt.</p>
      </div>
    </div>
  );
}

function Compare({ a, b, onTransfer, scenarioId }: { a: Attempt; b: Attempt; onTransfer: () => void; scenarioId: ScenarioId }) {
  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">First try → retry</p>
          <p className="mt-1 text-3xl font-bold">
            {a.total} → <span className={scoreTone(b.total).text}>{b.total}</span>
          </p>
        </div>
        <Delta from={a.total} to={b.total} />
      </div>
      <SideBySide a={a} b={b} la="First try" lb="Retry" />
      <div className="card border-calm/30 bg-calm-soft">
        <p className="font-semibold">Now prove it to yourself</p>
        <p className="mt-1 text-sm">
          A new situation, <b>{SCENARIOS[scenarioId].transfer.title.toLowerCase()}</b>, with no script. This shows whether the skill
          sticks, not just the words.
        </p>
        <button className="btn-primary mt-3" onClick={onTransfer}>
          Try a new situation on my own
        </button>
      </div>
    </div>
  );
}

function Done({ first, retry, transfer, scenarioId }: { first?: Attempt; retry?: Attempt; transfer: Attempt; scenarioId: ScenarioId }) {
  return (
    <div className="space-y-4">
      <div className="card text-center">
        <p className="text-sm text-muted">Your progress in one session</p>
        <div className="mt-3 flex items-end justify-center gap-6">
          {first && (
            <div>
              <ScoreRing value={first.total} size={72} />
              <p className="mt-1 text-xs text-muted">First try</p>
            </div>
          )}
          {retry && (
            <div>
              <ScoreRing value={retry.total} size={72} />
              <p className="mt-1 text-xs text-muted">Retry</p>
            </div>
          )}
          <div>
            <ScoreRing value={transfer.total} size={96} />
            <p className="mt-1 text-xs font-semibold text-calm">New situation, alone</p>
          </div>
        </div>
        {first && (
          <p className="mt-4 text-[15px]">
            First attempt <b>{first.total}</b>, new situation on your own <b className={scoreTone(transfer.total).text}>{transfer.total}</b>.
          </p>
        )}
      </div>
      {first && <SideBySide a={first} b={transfer} la="First try" lb={SCENARIOS[scenarioId].transfer.title} />}
      <ScorecardView card={transfer.turns[0].card} text={transfer.turns[0].parent} />
      <div className="card border-calm/30 bg-calm-soft">
        <p className="font-semibold">Keep it going: one short practice a day</p>
        <p className="mt-1 text-sm">Your 7 day plan targets your weakest skill. Day 1 is free.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/progress" className="btn-primary">
            See my plan
          </Link>
          <Link href="/" className="btn-ghost">
            Practice another moment
          </Link>
        </div>
      </div>
    </div>
  );
}
