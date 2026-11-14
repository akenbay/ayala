"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SCENARIOS, describe, type ScenarioId } from "@/lib/scenarios";
import type { CheckId, CheckResult, Dimension, Scorecard } from "@/lib/rubric/types";
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
  weakestDimension,
} from "@/lib/storage";
import {
  CDC_URL,
  CheckList,
  CountUp,
  Sparkles,
  DimensionBars,
  Highlighted,
  Legend,
  ScoreRing,
  Spinner,
  TypingDots,
  findMarks,
} from "@/components/ui";
import { codeCoach, reflectFeeling, type Coach } from "@/lib/coach";
import type { Crisis } from "@/lib/safety";
import { CrisisCard } from "@/components/CrisisCard";
import { Sam, faceFor } from "@/components/Sam";
import { lessonById } from "@/lib/lessons";
import { PlanPicker } from "@/components/PlanPicker";
import { SavePhrase } from "@/components/PhraseBank";
import { DIMENSION_LABELS } from "@/lib/rubric/types";
import { ENDING_STATES, MAX_PARENT_TURNS, STATE_LABEL, type SamState } from "@/lib/toddler";
import { Mic, Arrow, ArrowDown, ArrowUp, Back, Check, ChevronDown, Info } from "@/components/icons";


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
  tv: "screen_time",
  screens: "screen_time",
  dressed: "getting_dressed",
  carseat: "car_seat",
  bath: "bath_time",
  teeth: "brushing_teeth",
  dinner: "dinner_table",
  store: "store_candy",
  sharing: "sharing_toys",
  cleanup: "cleanup_toys",
  dropoff: "daycare_dropoff",
  work: "work_call",
  running: "running_off",
};

/** Labeled sample answers behind "Need an idea?". They run through the real scoring. */
const IDEAS = (id: ScenarioId) => ({ first: SCENARIOS[id].idea, retry: SCENARIOS[id].scripts[0] });

const SITUATION = (id: ScenarioId) => SCENARIOS[id].situation;

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

type Msg = { role: "child" | "parent"; text: string; card?: Scorecard; state?: SamState; setup?: boolean };
type Step = "chat" | "score" | "compare" | "paywall" | "done";

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
  const [customOpen, setCustomOpen] = useState<{ scene: string; setup: string; opener: string; idea: string | null } | null>(null);
  const customOpener = customOpen?.opener ?? null;
  const allowed = Boolean(store?.current && (SCENARIOS[store.current].free || store.unlocked));
  const ready = Boolean(store) && allowed;

  const [step, setStep] = useState<Step>("chat");
  const [kind, setKind] = useState<AttemptKind>("first");
  const [msgs, setMsgs] = useState<Msg[]>([]);
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
          st.lesson = null;
        });
        return;
      }
    }
    if (!store.current) router.replace("/");
    else if (store.current === "custom" && !store.custom?.situation) router.replace("/moment");
    else if (!allowed) router.replace("/pricing?from=" + store.current);
  }, [store, allowed, router]);

  // For the parent's own moment, Sam's first line is written for their situation.
  useEffect(() => {
    if (scenarioId !== "custom" || !own?.situation || customOpener) return;
    let alive = true;
    (async () => {
      let open = { scene: own.situation, setup: describe("custom", false).setup, opener: SCENARIOS.custom.childOpener, idea: null as string | null };
      try {
        const r = await fetch("/api/opener", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ age, situation: own.situation, child }),
        });
        const d = (await r.json()) as { scene?: string; setup?: string; opener?: string; idea?: string | null };
        if (d.opener) open = { scene: d.scene || open.scene, setup: d.setup || open.setup, opener: d.opener, idea: d.idea ?? null };
      } catch {}
      if (alive) setCustomOpen(open);
    })();
    return () => {
      alive = false;
    };
  }, [scenarioId, own?.situation, customOpener, age, child]);

  const scenario = SCENARIOS[scenarioId];
  const transfer = kind === "transfer";
  const title = transfer ? scenario.transfer.title : scenario.short;
  const openerFor = (t: boolean) => (scenarioId === "custom" && !t ? (customOpener ?? "…") : describe(scenarioId, t).childOpener);
  /** The chat starts mid-moment: what the parent already said (not scored), then Sam's refusal. */
  const openingFor = (t: boolean): Msg[] => [
    { role: "parent", text: scenarioId === "custom" && !t && customOpen ? customOpen.setup : describe(scenarioId, t).setup, setup: true },
    { role: "child", text: openerFor(t) },
  ];
  // The opening depends on the scenario, which is known only after the store loads.
  const shown = msgs.length === 0 ? openingFor(false) : msgs;
  // For the parent's own moment, Sam's first line is written on the server; hold replies until it arrives.
  const openerPending = scenarioId === "custom" && kind !== "transfer" && !customOpener;
  const openerText = openerPending ? undefined : shown.find((m) => m.role === "child")?.text;

  function startChat(k: AttemptKind) {
    setKind(k);
    setMsgs(openingFor(k === "transfer"));
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
      } else if (kind === "first" && s.plan.length && !s.plan.some((p) => p.done)) {
        // The first finished practice counts as day 1 of the plan.
        s.plan = s.plan.map((p) => (p.day === 1 ? { ...p, done: true } : p));
      }
    });
    setStep(kind === "first" ? "score" : kind === "retry" ? "compare" : "done");
    window.scrollTo({ top: 0 });
    loadCoach(kind, turns, openerText);
  }

  /** Asks the coach to read the whole conversation. Falls back to the code coach in the browser. */
  async function loadCoach(k: AttemptKind, turns: Turn[], opener?: string) {
    const input = { scenarioId, transfer: k === "transfer", age, turns, situation: customOpen?.scene ?? own?.situation, opener };
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
  const situationText =
    scenarioId === "custom" && !transfer
      ? (customOpen?.scene ?? own?.situation ?? "Your own moment")
      : `Your ${age} year old ${transfer ? SITUATION(scenarioId).transfer : SITUATION(scenarioId).main}`;
  const currentState = [...shown].reverse().find((m) => m.role === "child" && m.state)?.state;
  const lesson = kind === "first" ? lessonById(store?.lesson) : undefined;
  // "Need an idea?" starts from what Sam actually said, not a stock line.
  const ideaLines = describe(scenarioId, transfer).lines;
  const ideaFromSam =
    scenarioId === "custom" && !transfer && customOpen?.idea
      ? customOpen.idea
      : openerText
        ? [reflectFeeling(openerText) ?? ideaLines.feeling, ideaLines.limit, ideaLines.choice].join(" ")
        : IDEAS(scenarioId).first;
  const firstCoach = typeof coaches.first === "object" ? coaches.first : null;

  return (
    <div className="-mx-5 flex min-h-[100dvh] flex-col">
      <PracticeHeader
        title={title}
        step={step}
        kind={kind}
        scene={step === "chat" ? { text: situationText, state: currentState, opener: true } : undefined}
      />

      <div className="mx-auto w-full max-w-xl flex-1 px-4 sm:px-5">
        {step === "chat" && (
          <Chat
            key={`${scenarioId}-${kind}`}
            scenarioId={scenarioId}
            age={age}
            context={context}
            transfer={transfer}
            situation={situationText}
            ownSituation={scenarioId === "custom" && !transfer ? (customOpen?.scene ?? own?.situation) : undefined}
            child={child}
            initialText={kind === "first" && scenarioId === "custom" ? own?.said : undefined}
            banner={
              kind === "retry" && firstCoach
                ? {
                    label: "Your tip",
                    text: firstCoach.change.quote
                      ? `Instead of "${firstCoach.change.quote}": ${/^(Sam|I)\b/.test(firstCoach.change.why) ? firstCoach.change.why : firstCoach.change.why.charAt(0).toLowerCase() + firstCoach.change.why.slice(1)}`
                      : firstCoach.change.why,
                  }
                : kind === "retry" && tip
                ? { label: "Your tip", text: FOCUS_TIPS[tip.dimension] }
                : transfer
                  ? { label: "On your own", text: "A new moment. No tips this time." }
                  : kind === "first" && scenarioId === "custom" && own?.said
                    ? { label: "Today I lost it", text: "Your words are ready below. Send them to see how Sam reacts, then we'll find a better way together." }
                    : lesson
                      ? { label: `Lesson: ${lesson.title}`, text: lesson.focus }
                      : null
            }
            msgs={shown}
            setMsgs={setMsgs}
            waiting={openerPending}
            idea={
              kind === "first" ? ideaFromSam : kind === "retry" ? (firstCoach?.rewrite?.text ?? IDEAS(scenarioId).retry) : null
            }
            ideaLabel={kind === "retry" && firstCoach?.rewrite ? "Your words, improved" : "One idea (sample)"}
            onFinish={finishAttempt}
          />
        )}

        {step === "score" && results.first && (
          <AttemptScore attempt={results.first} coach={coaches.first} onRetry={() => startChat("retry")} />
        )}

        {step === "compare" && results.first && results.retry && (
          <Compare
            a={results.first}
            b={results.retry}
            coach={coaches.retry}
            scenarioId={scenarioId}
            ownSituation={customOpen?.scene ?? own?.situation}
            onTransfer={() => {
              if (store?.unlocked) startChat("transfer");
              else {
                setStep("paywall");
                window.scrollTo({ top: 0 });
              }
            }}
          />
        )}

        {step === "paywall" && store && <Paywall onContinue={() => startChat("transfer")} />}

        {step === "done" && results.transfer && (
          <Done first={results.first} retry={results.retry} transfer={results.transfer} coach={coaches.transfer} />
        )}
      </div>
    </div>
  );
}

function PracticeHeader({
  title,
  step,
  kind,
  scene,
}: {
  title: string;
  step: Step;
  kind: AttemptKind;
  scene?: { text: string; state?: SamState; opener: boolean };
}) {
  const active =
    step === "chat" ? (kind === "first" ? 0 : kind === "retry" ? 1 : 2) : step === "score" ? 1 : step === "compare" || step === "paywall" ? 2 : 3;
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
                <span className={`h-1.5 rounded-full transition-colors duration-300 ${done ? "bg-ink" : now ? "bg-orange" : "bg-line"}`} />
                <span className={`flex items-center gap-1 text-[13px] ${now ? "font-extrabold" : done ? "font-semibold" : "font-medium text-muted"}`}>
                  {done ? <Check size={13} /> : `${i + 1}`} {l}
                </span>
              </li>
            );
          })}
        </ol>
        {scene && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-peach px-3 py-2.5">
            <Sam face={faceFor(scene.state, scene.opener)} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug">{scene.text}</p>
              {scene.state && (
                <p key={scene.state} className="anim-fade-down mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-soft-ink">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${STATE_DOT[scene.state]}`} />
                  Sam: {STATE_LABEL[scene.state].toLowerCase()}
                </p>
              )}
            </div>
          </div>
        )}
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

type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognizerCtor(): (new () => Recognizer) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};

/** Speak instead of type, where the browser supports it (Chrome, Safari). Text appears in the box to check before sending. */
function useVoice(onText: (t: string) => void) {
  const supported = useSyncExternalStore(noop, () => Boolean(recognizerCtor()), () => false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognizer | null>(null);
  useEffect(() => () => rec.current?.stop(), []);
  function toggle() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = recognizerCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const said = Array.from(e.results)
        .map((x) => x[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (said) onText(said);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }
  return { supported, listening, toggle };
}

function SamBubble({ text, typing = false, state, opener = false }: { text?: string; typing?: boolean; state?: SamState; opener?: boolean }) {
  return (
    <div className="anim-bubble flex max-w-[86%] items-end gap-2">
      <span className="shrink-0">
        <Sam face={faceFor(state, opener)} size={34} />
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
  waiting?: boolean; // Sam's first line is still loading
  child?: { sex?: "boy" | "girl" | "unsaid"; temperament?: "calm" | "active" | "fiery" | "sensitive" };
  initialText?: string;
}) {
  const { scenarioId, age, context, transfer, banner, msgs, setMsgs, idea, ideaLabel, onFinish, ownSituation, child, initialText, waiting = false } = props;
  const [text, setText] = useState(initialText ?? "");
  const [busy, setBusy] = useState<"" | "score" | "child">("");
  const [error, setError] = useState("");
  const [showIdea, setShowIdea] = useState(false);
  const [pending, setPending] = useState("");
  const [crisis, setCrisis] = useState<Crisis["kind"] | null>(null);
  const [ageOpen, setAgeOpen] = useState(false);
  const [quick, setQuick] = useState(false); // Sam is using prewritten lines because the AI did not answer
  const voice = useVoice((said) => setText((t) => (t ? `${t} ${said}` : said).slice(0, MAX_CHARS)));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasBusy = useRef(false);
  const parentTurns = msgs.filter((m) => m.role === "parent" && !m.setup).length;
  const lastState = [...msgs].reverse().find((m) => m.role === "child" && m.state)?.state;
  const ended = !busy && parentTurns > 0 && ((lastState && ENDING_STATES.includes(lastState)) || parentTurns >= MAX_PARENT_TURNS);
  const outcome = OUTCOME[lastState ?? "resisting"];
  const canType = !ended && parentTurns < MAX_PARENT_TURNS;

  // Keep the newest message in view, including after the ending card appears in the footer.
  useEffect(() => {
    if (parentTurns === 0 && !busy) return; // on open, stay at the top so the situation and opening are visible
    const id = requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
    return () => cancelAnimationFrame(id);
  }, [msgs.length, busy, ended, parentTurns]);



  // The reply box is disabled while Sam answers, which drops focus. Give it back so the parent can keep typing.
  useEffect(() => {
    if (wasBusy.current && !busy) inputRef.current?.focus({ preventScroll: true });
    wasBusy.current = busy !== "";
  }, [busy]);

  async function send() {
    const t = text.trim();
    if (!t || !canType || busy || waiting) return;
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
      const setupLine = next.find((m) => m.setup)?.text;
      const history = next.filter((m) => !m.setup).map((m) => ({ role: m.role === "child" ? "assistant" : "user", content: m.text }));
      // The parent's reply is already scored and shown, so Sam always answers: a failed request
      // gets a stand-in line instead of leaving the conversation stuck without a reply.
      let d: { reply: string; state: SamState; degraded?: boolean } = { reply: "Hmph.", state: "resisting", degraded: true };
      try {
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
            setup: setupLine,
            passed: Object.fromEntries((data as Scorecard).checks.map((c) => [c.id, c.passed])),
            total: (data as Scorecard).total,
          }),
        });
        if (r.ok) d = (await r.json()) as typeof d;
      } catch {}
      setQuick(Boolean(d.degraded));
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
            {parentTurns === 0 && !ownSituation && (
              <p className="px-1 text-[13px] text-muted">
                Age {age},{" "}
                {ageOpen ? (
                  ([2, 3, 4] as Age[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={n === age}
                      onClick={() => {
                        update((st) => {
                          st.childAge = n;
                        });
                        setAgeOpen(false);
                      }}
                      className={`mx-0.5 rounded-full px-2.5 py-1 text-[13px] font-bold ${n === age ? "bg-ink text-cream" : "bg-cream"}`}
                    >
                      {n}
                    </button>
                  ))
                ) : (
                  <button type="button" onClick={() => setAgeOpen(true)} className="font-semibold text-ink underline underline-offset-2">
                    change
                  </button>
                )}
              </p>
            )}

        {SCENARIOS[scenarioId].safetyFirst && !transfer && parentTurns === 0 && (
          <p className="-mt-1.5 px-1 text-[13px] text-muted">If anyone is unsafe, focus on safety before practicing what to say.</p>
        )}

        {banner && (
          <div className="rounded-2xl bg-peach px-4 py-3">
            <span className="label-caps text-ink">{banner.label}</span>
            <p className="mt-1 text-base font-semibold leading-snug">{banner.text}</p>
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === "child" ? (
            <SamBubble key={i} text={m.text} state={m.state} opener={!m.state} typing={waiting && !m.state} />
          ) : m.setup ? (
            <div key={i} className="anim-bubble flex max-w-[86%] flex-col items-end gap-1 self-end">
              <span className="pr-1 text-[13px] text-muted">You, a moment ago</span>
              <p className="rounded-[18px] rounded-br-md border-[1.5px] border-dashed border-field bg-white px-[15px] py-3 text-[17px] leading-snug text-soft-ink">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={i} className="anim-bubble flex max-w-[86%] flex-col items-end gap-1 self-end">
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
      </div>

      <footer className="sticky bottom-0 -mx-4 border-t border-line bg-white px-4 pb-3 pt-2.5 sm:mx-0 sm:rounded-t-2xl sm:border-x">
        {ended && (
          <div role="status" className={`anim-rise mb-2.5 flex items-center gap-3 rounded-2xl px-4 py-3 ${outcome.tone}`}>
            <Sam face={faceFor(lastState)} size={44} />
            <div>
            <p className="text-[17px] font-extrabold">{outcome.title}</p>
            <p className="mt-0.5 text-[15px] leading-snug text-soft-ink">{outcome.text}</p>
            </div>
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
              {idea && parentTurns === 0 && !showIdea && !waiting ? (
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
                ref={inputRef}
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
                className="max-h-32 min-h-[52px] flex-1 resize-none rounded-2xl border-[1.5px] border-field bg-cream px-3.5 py-3 text-[17px] leading-snug outline-none placeholder:text-muted focus:border-ink disabled:border-line disabled:bg-peach-soft"
              />
              {voice.supported && (
                <button
                  type="button"
                  aria-label={voice.listening ? "Stop listening" : "Speak your reply"}
                  aria-pressed={voice.listening}
                  onClick={voice.toggle}
                  disabled={busy !== ""}
                  className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition ${
                    voice.listening ? "animate-pulse border-red bg-bad-soft" : "border-field bg-white"
                  }`}
                >
                  <Mic size={22} />
                </button>
              )}
              <button
                type="button"
                aria-label="Send"
                onClick={send}
                disabled={!text.trim() || busy !== "" || waiting}
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-orange text-ink transition duration-150 hover:bg-orange-hover active:scale-95 disabled:bg-track disabled:text-muted"
              >
                {busy === "score" ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" /> : <ArrowUp size={22} />}
              </button>
            </div>
          </>
        )}
        <p className="mt-2 text-center text-xs text-muted">
          {parentTurns === 0 && !transfer ? "About 2 minutes. No account needed. " : ""}Sam is a pretend toddler. Real children respond differently.
          {quick && " Quick mode: Sam is using prewritten lines right now."}
        </p>
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
      {open && <div className="anim-fade-down space-y-4 pb-2 pt-1">{children}</div>}
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
          <mark key={i} className="good anim-rise" style={{ animationDelay: `${150 + Math.min(i, 30) * 25}ms` }}>
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
type CoachPart = "summary" | "keep" | "change" | "heard";

function CoachNotes({
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
function phraseSituation(a: Attempt, ownSituation?: string): string {
  if (a.kind === "transfer") return SCENARIOS[a.scenarioId].transfer.title;
  if (a.scenarioId === "custom") {
    const t = (ownSituation ?? "Your own moment").trim();
    return t.length > 60 ? t.slice(0, 57).trimEnd() + "…" : t;
  }
  return SCENARIOS[a.scenarioId].short;
}

function Improved({ rewrite, attempt }: { rewrite: NonNullable<Coach["rewrite"]>; attempt: Attempt }) {
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

/** First feedback: one change, your improved sentence, and the retry. Everything else is one tap away. */
function AttemptScore({ attempt, coach, onRetry }: { attempt: Attempt; coach?: Coach | "loading"; onRetry: () => void }) {
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
const GAIN_VERB: Partial<Record<CheckId, string>> = {
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
function UsefulAsk({ attemptId }: { attemptId: string }) {
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
function Paywall({ onContinue }: { onContinue: () => void }) {
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

function Compare({
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

function Done({ first, retry, transfer, coach }: { first?: Attempt; retry?: Attempt; transfer: Attempt; coach?: Coach | "loading" }) {
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
