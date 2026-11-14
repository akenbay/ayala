"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SCENARIO_LIST, type ScenarioId } from "@/lib/scenarios";
import { focusLabel, update, useStore, type Age } from "@/lib/storage";
import { TEST_CARD } from "@/lib/pricing";
import { Arrow, ChevronRight, ScenarioIcon } from "@/components/icons";

const MINUTES: Record<ScenarioId, number> = { leaving_playground: 2, bedtime_refusal: 2, hitting_sibling: 3, custom: 3 };

export default function Home() {
  const router = useRouter();
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const age: Age = store?.childAge ?? 3;
  const context = store?.context ?? "";
  const unlocked = store?.unlocked ?? false;
  const nextPlan = store?.plan.find((p) => !p.done);
  const doneDays = store?.plan.filter((p) => p.done).length ?? 0;

  function start(id: ScenarioId, planDay: number | null = null) {
    const sc = SCENARIO_LIST.find((s) => s.id === id)!;
    const locked = (!sc.free || (planDay !== null && planDay > 1)) && !unlocked;
    if (locked) {
      router.push("/pricing?from=" + id);
      return;
    }
    update((s) => {
      s.current = id;
      s.currentPlanDay = planDay;
    });
    router.push("/practice");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section className="pt-6 sm:pt-12">
        <h1 className="max-w-3xl text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-6xl sm:leading-[1.05]">
          Practice the words before the hard moment.
        </h1>
        <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted sm:mt-5 sm:text-xl">
          Pick a moment. Type what you&apos;d really say. Sam, a practice toddler, pushes back, and you get a score and one tip.
        </p>
        {store && !store.profile && (
          <Link href="/start" className="btn-primary mt-5 h-14 w-full text-lg sm:w-auto">
            Get my plan in 60 seconds <Arrow size={20} />
          </Link>
        )}
      </section>

      {store && !store.profile && <p className="mt-6 text-[15px] font-semibold text-muted sm:mt-10">Or jump straight into a moment:</p>}

      <nav aria-label="Scenarios" className={`grid gap-3 sm:grid-cols-3 sm:gap-5 ${store && !store.profile ? "mt-3" : "mt-6 sm:mt-10"}`}>
        {SCENARIO_LIST.map((s) => {
          const plus = !s.free && !unlocked;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => start(s.id)}
              className="flex min-h-[92px] items-center gap-4 rounded-2xl bg-white p-4 pl-[18px] text-left transition hover:shadow-[0_0_0_2px_#000] sm:min-h-[220px] sm:flex-col sm:items-start sm:p-6"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-peach sm:h-16 sm:w-16">
                <ScenarioIcon id={s.id} />
              </span>
              <span className="flex flex-1 flex-col gap-1 sm:mt-auto sm:w-full">
                <span className="flex items-center gap-2">
                  <span className="text-xl font-bold sm:text-2xl sm:font-extrabold">{s.short}</span>
                  {plus && <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-cream">Plus</span>}
                </span>
                <span className="flex items-center justify-between text-[15px] text-muted sm:text-base">
                  About {MINUTES[s.id]} minutes
                  <Arrow size={22} className="hidden text-ink sm:block" />
                </span>
              </span>
              <ChevronRight size={20} className="sm:hidden" />
            </button>
          );
        })}
      </nav>

      <Link
        href="/moment"
        className="mt-3 flex items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-ink/40 bg-paper p-4 pl-[18px] transition hover:border-ink sm:mt-5 sm:p-5"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange">
          <ScenarioIcon id="custom" />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-xl font-bold">Your own moment</span>
          <span className="text-[15px] text-muted">Describe what happens at home, or what you said when you lost it today.</span>
        </span>
        <ChevronRight size={20} />
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:mt-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="sm:flex-1">
          <p className="text-[15px] text-muted sm:text-base">
            Child&apos;s age: <b className="text-ink">{age}</b>,{" "}
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
              className="-mx-1 px-1 py-3 font-semibold text-ink underline underline-offset-[3px]"
            >
              {editing ? "done" : "change"}
            </button>
          </p>
          {editing && (
            <div className="mt-1 max-w-md space-y-4 rounded-2xl bg-white p-4">
              <div className="flex gap-2" role="group" aria-label="Child's age">
                {([2, 3, 4] as Age[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="chip"
                    aria-pressed={age === a}
                    onClick={() =>
                      update((s) => {
                        s.childAge = a;
                      })
                    }
                  >
                    {a} years
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="ctx" className="text-[15px] font-semibold">
                  Anything Sam should know? <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="ctx"
                  value={context}
                  maxLength={120}
                  onChange={(e) =>
                    update((s) => {
                      s.context = e.target.value.slice(0, 120);
                    })
                  }
                  placeholder="He's usually tired after daycare"
                  className="mt-2 h-12 w-full rounded-xl border-[1.5px] border-field bg-cream px-3.5 text-base outline-none focus:border-ink"
                />
                <p className="mt-1.5 text-[13px] text-muted">Please don&apos;t enter your child&apos;s real name.</p>
              </div>
            </div>
          )}
        </div>

        {nextPlan && (
          <button
            type="button"
            onClick={() => start(nextPlan.scenarioId, nextPlan.day)}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-line bg-paper px-[18px] py-4 text-left sm:max-w-[420px]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream text-[15px] font-extrabold">
              {doneDays + 1}/7
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[17px] font-bold">Day {nextPlan.day} of your plan</span>
              <span className="text-[15px] text-muted">
                {SCENARIO_LIST.find((s) => s.id === nextPlan.scenarioId)?.short}: {focusLabel(nextPlan.focus).toLowerCase()}
              </span>
            </span>
            <span className="flex items-center gap-1 text-base font-bold">
              Continue <Arrow size={18} />
            </span>
          </button>
        )}
      </div>

      <details className="group mx-auto mt-10 max-w-xl text-center">
        <summary className="inline-flex cursor-pointer list-none px-2 py-2.5 text-[15px] font-semibold underline underline-offset-[3px]">
          Judges: 3 minute tour
        </summary>
        <ol className="mt-3 list-decimal space-y-2 rounded-2xl bg-white p-5 pl-9 text-left text-[15px] leading-relaxed text-soft-ink">
          <li>Tap <b>Get my plan in 60 seconds</b>: 7 taps shape Sam (age, boy or girl, temperament), your first focus and a reminder time.</li>
          <li>Type what you&apos;d say to Sam, or tap <b>Need an idea?</b> for a labeled sample. A line under each reply shows how Sam is doing; the practice ends when Sam goes along, melts down or gets their way.</li>
          <li><b>See my score</b>: what happened, what to keep, what to change (with the CDC page), how Sam heard it, and your own words improved and re-scored.</li>
          <li>Retry with your tip, then a <b>new situation with no tips</b>.</li>
          <li><b>Your own moment</b>: describe your real situation, or <b>Today I lost it</b> with what you actually said. Try typing something like &ldquo;I can&apos;t do this anymore&rdquo; to see the crisis safety screen.</li>
          <li><b>Your progress</b>: 7 day plan, skills, calendar reminder. <b>See a sample week</b> shows labeled demo data. <b>Plus</b> uses Stripe test card <code className="font-mono font-semibold">{TEST_CARD}</code>.</li>
        </ol>
      </details>
    </div>
  );
}
