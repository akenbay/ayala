"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SCENARIO_LIST, type ScenarioId } from "@/lib/scenarios";
import { FOCUS_TIPS, focusLabel, update, useStore, type Age } from "@/lib/storage";

const EMOJI: Record<ScenarioId, string> = {
  leaving_playground: "🛝",
  bedtime_refusal: "🌙",
  hitting_sibling: "✋",
};

export default function Home() {
  const router = useRouter();
  const store = useStore();
  const [scenarioSel, setScenario] = useState<ScenarioId | null>(null);
  const [ageSel, setAge] = useState<Age | null>(null);
  const [contextSel, setContext] = useState<string | null>(null);
  const scenario = scenarioSel ?? store?.current ?? "leaving_playground";
  const age = ageSel ?? store?.childAge ?? 3;
  const context = contextSel ?? store?.context ?? "";

  const unlocked = store?.unlocked ?? false;
  const nextPlan = store?.plan.find((p) => !p.done);

  function start(id: ScenarioId, planDay: number | null = null) {
    const sc = SCENARIO_LIST.find((s) => s.id === id)!;
    if (!sc.free && !unlocked) {
      router.push("/pricing?from=" + id);
      return;
    }
    update((s) => {
      s.current = id;
      s.childAge = age;
      s.context = context.slice(0, 120);
      s.currentPlanDay = planDay;
    });
    router.push("/practice");
  }

  return (
    <div className="space-y-8">
      <section className="pt-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-calm">For parents of 2 to 4 year olds</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          Practice what to say before the hardest five minutes of your day.
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Parenting advice is easy to read and hard to use at 6 PM. Rehearse the moment with a practice toddler, see exactly
          which of your words helped, and try again. Two minutes, no sign up.
        </p>
      </section>

      <details className="rounded-2xl border border-calm/30 bg-white/70 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-calm">For the jury: a 3 minute tour</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Press <b>Start practicing</b>, read the script, then type your own sentence (or press <b>Try a sample answer</b>, labeled sample input that runs through the real scoring).</li>
          <li>Reply to the practice toddler once, open <b>See my score</b>: every point quotes your words.</li>
          <li>Retry, compare, then handle a <b>new situation with no script</b>.</li>
          <li>Open <b>Progress</b>: your plan and a daily calendar reminder. <b>See a sample week (demo)</b> shows a week of progress instantly.</li>
          <li>Open <b>Plus</b> and pay with Stripe test card <code className="font-mono">4242 4242 4242 4242</code>, any future date, any CVC.</li>
        </ol>
      </details>

      {store && store.attempts.length > 0 && (
        <section className="card flex flex-col gap-3 border-calm/30 bg-calm-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-calm">Welcome back</p>
            {nextPlan ? (
              <p className="mt-1 text-sm">
                Day {nextPlan.day} of your plan: <b>{SCENARIO_LIST.find((s) => s.id === nextPlan.scenarioId)?.short}</b>, focus on{" "}
                <b>{focusLabel(nextPlan.focus).toLowerCase()}</b>. {FOCUS_TIPS[nextPlan.focus]}
              </p>
            ) : (
              <p className="mt-1 text-sm">You have {store.attempts.length} practice rounds saved. See your progress and plan.</p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {nextPlan && (nextPlan.day === 1 || unlocked) ? (
              <button className="btn-primary" onClick={() => start(nextPlan.scenarioId, nextPlan.day)}>
                Start day {nextPlan.day}
              </button>
            ) : null}
            <Link href="/progress" className="btn-ghost">
              Progress
            </Link>
          </div>
        </section>
      )}

      <section className="card space-y-6">
        <div>
          <h2 className="text-lg font-semibold">1. Which moment is hard right now?</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {SCENARIO_LIST.map((s) => {
              const locked = !s.free && !unlocked;
              const selected = scenario === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScenario(s.id)}
                  aria-pressed={selected}
                  className={`relative rounded-xl border p-4 text-left transition ${
                    selected ? "border-calm bg-calm-soft ring-2 ring-calm/20" : "border-line bg-white hover:border-calm/40"
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {EMOJI[s.id]}
                  </span>
                  <span className="mt-2 block font-medium leading-snug">{s.title}</span>
                  {locked && (
                    <span className="absolute right-3 top-3 rounded-full bg-sun-soft px-2 py-0.5 text-[11px] font-semibold text-[#8a5a12]">
                      🔒 Plus
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">2. How old is your child?</h2>
          <div className="mt-3 flex gap-2">
            {([2, 3, 4] as Age[]).map((a) => (
              <button key={a} type="button" className="chip" aria-pressed={age === a} onClick={() => setAge(a)}>
                {a} years
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ctx" className="text-lg font-semibold">
            3. Anything we should know? <span className="text-sm font-normal text-muted">(optional)</span>
          </label>
          <input
            id="ctx"
            value={context}
            maxLength={120}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. He's usually tired after daycare"
            className="mt-3 w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-calm"
          />
          <p className="mt-1 text-xs text-muted">Shapes how the practice toddler reacts. Please don&apos;t enter your child&apos;s real name.</p>
        </div>

        <button className="btn-primary w-full sm:w-auto" onClick={() => start(scenario)}>
          {!SCENARIO_LIST.find((s) => s.id === scenario)!.free && !unlocked ? "Unlock with Plus" : "Start practicing"}
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Read a script", "A short example of what to say, written from CDC guidance."],
          ["Practice the moment", "Type what you'd really say. A practice toddler pushes back."],
          ["See what worked", "Every point is tied to your own words. Retry, then try a new situation alone."],
        ].map(([t, d], i) => (
          <div key={t} className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="text-xs font-semibold text-calm">Step {i + 1}</p>
            <p className="mt-1 font-medium">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
