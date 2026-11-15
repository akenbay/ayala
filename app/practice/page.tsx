"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SCENARIOS, describe, type ScenarioId } from "@/lib/scenarios";
import { FOCUS_TIPS, buildPlan, newId, summarize, update, useStore, type Age, type Attempt, type AttemptKind, type Turn } from "@/lib/storage";
import { Spinner } from "@/components/ui";
import { codeCoach, reflectFeeling, type Coach } from "@/lib/coach";
import { lessonById } from "@/lib/lessons";
import { biggestMiss, type Msg, type Step } from "@/components/practice/shared";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { Chat } from "@/components/practice/Chat";
import { AttemptScore, Compare, Done, Paywall } from "@/components/practice/Screens";

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
      const lost = Boolean(own.said?.trim());
      let open = { scene: own.situation, setup: lost ? "" : describe("custom", false).setup, opener: SCENARIOS.custom.childOpener, idea: null as string | null };
      try {
        const r = await fetch("/api/opener", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ age, situation: own.situation, child, ...(lost ? { said: own.said } : {}) }),
        });
        const d = (await r.json()) as { scene?: string; setup?: string; opener?: string; idea?: string | null };
        if (d.opener) open = { scene: d.scene || open.scene, setup: lost ? "" : d.setup || open.setup, opener: d.opener, idea: d.idea ?? null };
      } catch {}
      if (alive) setCustomOpen(open);
    })();
    return () => {
      alive = false;
    };
  }, [scenarioId, own?.situation, own?.said, customOpener, age, child]);

  const scenario = SCENARIOS[scenarioId];
  const transfer = kind === "transfer";
  const title = transfer ? scenario.transfer.title : scenario.short;
  const openerFor = (t: boolean) => (scenarioId === "custom" && !t ? (customOpener ?? "…") : describe(scenarioId, t).childOpener);
  /** The chat starts mid-moment: what the parent already said (not scored), then Sam's refusal. */
  const openingFor = (t: boolean): Msg[] => {
    const setup = scenarioId === "custom" && !t && customOpen ? customOpen.setup : describe(scenarioId, t).setup;
    // "Today I lost it" has no made-up earlier line: the parent's real words are the first reply.
    const lostFirst = scenarioId === "custom" && !t && Boolean(own?.said?.trim());
    return [...(setup && !lostFirst ? [{ role: "parent" as const, text: setup, setup: true }] : []), { role: "child", text: openerFor(t) }];
  };
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
