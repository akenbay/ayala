"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SCENARIOS, SCENARIO_LIST, type ScenarioId } from "@/lib/scenarios";
import { LESSONS, lessonForSkill, lessonSource, type Lesson } from "@/lib/lessons";
import { focusLabel, resetStore, update, useStore, weakestDimension, type Age } from "@/lib/storage";
import { TEST_CARD } from "@/lib/pricing";
import { Arrow, Check, ChevronDown, Info, ScenarioIcon } from "@/components/icons";
import { Sam } from "@/components/Sam";

const MINUTES: Record<ScenarioId, number> = { leaving_playground: 2, bedtime_refusal: 2, hitting_sibling: 3, custom: 3 };

export default function Home() {
  const router = useRouter();
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const age: Age = store?.childAge ?? 3;
  const context = store?.context ?? "";
  const unlocked = store?.unlocked ?? false;
  const nextPlan = store?.plan.find((p) => !p.done);
  const doneDays = store?.plan.filter((p) => p.done).length ?? 0;
  const hasProfile = Boolean(store?.profile);

  // Your path: one clear next step, computed from what the parent has already done on this device.
  const real = (store?.attempts ?? []).filter((a) => !a.demo);
  const focusLesson = lessonForSkill(weakestDimension(real) ?? store?.profile?.focus);
  const read = store?.lessonsRead ?? [];
  const plusLesson = !SCENARIOS[focusLesson.practice].free && !unlocked;
  const steps: { key: string; title: string; detail: string; done: boolean; go: () => void; cta: string }[] = [
    { key: "quiz", title: "Tell us about your child", detail: "7 taps, about 60 seconds. Sam will act like your child.", done: hasProfile, go: () => router.push("/start"), cta: "Get my plan in 60 seconds" },
    {
      key: "learn",
      title: `Learn: ${focusLesson.title.toLowerCase()}`,
      detail: "A 2 minute idea from CDC guidance.",
      done: read.includes(focusLesson.id),
      go: () => openLessonCard(focusLesson.id),
      cta: "Open the lesson",
    },
    {
      key: "practice",
      title: "Practice it with Sam",
      detail: `${SCENARIOS[focusLesson.practice].short}. About 2 minutes.`,
      done: real.some((a) => a.kind === "first"),
      go: () => start(focusLesson.practice, null, focusLesson.id),
      cta: plusLesson ? "Unlock to practice" : "Start practicing",
    },
    {
      key: "improve",
      title: "Improve your words",
      detail: "Get one tip, retry, and see your gain.",
      done: real.some((a) => a.kind === "retry"),
      go: () => start(focusLesson.practice, null, focusLesson.id),
      cta: "Practice and retry",
    },
    {
      key: "transfer",
      title: "Try it alone in a new moment",
      detail: "No tips. Shows the skill sticks.",
      done: real.some((a) => a.kind === "transfer"),
      go: () => start(focusLesson.practice, null, focusLesson.id),
      cta: "Practice the full round",
    },
    {
      key: "habit",
      title: "Keep going: 2 minutes a day",
      detail: "Your 7 day plan and a reminder before the hard hour.",
      done: (store?.plan.filter((p) => p.done).length ?? 0) >= 2,
      go: () => router.push("/progress"),
      cta: "Open my plan",
    },
  ];
  const current = steps.findIndex((x) => !x.done);

  function openLessonCard(id: string) {
    setOpenLesson(id);
    markRead(id);
    requestAnimationFrame(() => document.getElementById(`lesson-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function markRead(id: string) {
    update((s) => {
      s.lessonsRead = Array.from(new Set([...(s.lessonsRead ?? []), id]));
    });
  }

  function start(id: ScenarioId, planDay: number | null = null, lesson: string | null = null) {
    const sc = SCENARIOS[id];
    const locked = (!sc.free || (planDay !== null && planDay > 1)) && !unlocked;
    if (locked) {
      router.push("/pricing?from=" + id);
      return;
    }
    update((s) => {
      s.current = id;
      s.currentPlanDay = planDay;
      s.lesson = lesson;
    });
    router.push("/practice");
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* 1. Hero: one promise, one main action */}
      <section className="pt-5 sm:pt-10">
        <div className="anim-rise relative mx-auto mb-2 flex w-full max-w-[300px] justify-center">
          <span aria-hidden className="absolute inset-x-6 bottom-2 top-8 rounded-full bg-peach blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bears.svg"
            alt="A parent bear hugging a baby bear"
            width={754}
            height={732}
            className="anim-bob relative h-auto w-[240px] sm:w-[300px]"
          />
        </div>
        <h1 className="anim-rise font-display text-center text-[34px] leading-[1.1] sm:text-5xl" style={{ animationDelay: "40ms" }}>
          Practice the words before the hard moment.
        </h1>
        <p className="anim-rise mx-auto mt-3 max-w-md text-center text-[17px] leading-relaxed text-muted" style={{ animationDelay: "80ms" }}>
          Learn one idea from CDC guidance, then rehearse it with Sam, a pretend toddler.
        </p>

        <div className="anim-rise mx-auto mt-5 max-w-md" style={{ animationDelay: "120ms" }}>
          {store && current < 0 && nextPlan && (
            <button
              type="button"
              onClick={() => start(nextPlan.scenarioId, nextPlan.day)}
              className="shadow-soft flex w-full items-center gap-3.5 rounded-3xl bg-white px-5 py-4 text-left"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-peach text-[15px] font-extrabold">
                {doneDays + 1}/7
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[17px] font-bold">Continue: day {nextPlan.day}</span>
                <span className="text-[15px] text-muted">
                  {SCENARIOS[nextPlan.scenarioId].short}: {focusLabel(nextPlan.focus).toLowerCase()}
                </span>
              </span>
              <Arrow size={20} />
            </button>
          )}
        </div>
      </section>

      {/* Your path: what to do first, then next */}
      {store && (
        <section aria-labelledby="path-h" className="mt-9">
          <div className="flex items-baseline justify-between">
            <h2 id="path-h" className="font-display text-[24px]">
              Your path
            </h2>
            <span className="text-[13px] text-muted">
              {steps.filter((x) => x.done).length} of {steps.length} done
            </span>
          </div>
          <ol className="relative mt-4">
            {steps.map((st, i) => {
              const isNow = i === current;
              return (
                <li key={st.key} className="anim-rise relative flex gap-4 pb-5 last:pb-0" style={{ animationDelay: `${i * 50}ms` }}>
                  {i < steps.length - 1 && (
                    <span aria-hidden className={`absolute left-[19px] top-10 h-[calc(100%-36px)] w-0.5 rounded ${st.done ? "bg-good-line" : "bg-line"}`} />
                  )}
                  <span
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${
                      st.done ? "bg-good-soft text-good" : isNow ? "bg-orange text-ink shadow-[0_0_0_6px_#FFF0D8]" : "bg-white text-muted"
                    }`}
                  >
                    {st.done ? <Check size={16} /> : i + 1}
                  </span>
                  <div className={`flex-1 ${isNow ? "rounded-2xl bg-white p-4 shadow-soft" : "pt-2"}`}>
                    <p className={`text-[16px] leading-snug ${isNow ? "font-bold" : st.done ? "font-semibold text-muted line-through decoration-1" : "font-semibold"}`}>
                      {st.title}
                    </p>
                    {(isNow || !st.done) && <p className="mt-0.5 text-[14px] text-muted">{st.detail}</p>}
                    {isNow && (
                      <button type="button" onClick={st.go} className="btn-primary mt-3 h-12 w-full">
                        {st.cta} <Arrow size={18} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* 2. Learn, then practice */}
      <section aria-labelledby="learn-h" className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 id="learn-h" className="font-display text-[24px]">
            All lessons
          </h2>
          <span className="text-[13px] text-muted">From CDC guidance</span>
        </div>
        <ul className="mt-3 flex flex-col gap-3">
          {LESSONS.map((l, i) => (
            <LessonCard
              key={l.id}
              lesson={l}
              index={i}
              open={openLesson === l.id}
              locked={!SCENARIOS[l.practice].free && !unlocked}
              onToggle={() => {
                if (openLesson !== l.id) markRead(l.id);
                setOpenLesson((v) => (v === l.id ? null : l.id));
              }}
              onPractice={() => start(l.practice, null, l.id)}
            />
          ))}
        </ul>
      </section>

      {/* 3. Practice a moment directly */}
      <section aria-labelledby="practice-h" className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 id="practice-h" className="font-display text-[24px]">
            Practice a moment
          </h2>
          <span className="text-[13px] text-muted">
            Age {age},{" "}
            <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="font-semibold text-ink underline underline-offset-2">
              {editing ? "done" : "change"}
            </button>
          </span>
        </div>

        {editing && (
          <div className="anim-fade-down mt-3 space-y-4 rounded-2xl bg-white p-4">
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

        <div className="mt-3 grid grid-cols-2 gap-3">
          {SCENARIO_LIST.map((s) => {
            const plus = !s.free && !unlocked;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => start(s.id)}
                className="flex min-h-[132px] flex-col items-start gap-2 rounded-2xl bg-white p-4 text-left transition duration-150 hover:shadow-[0_0_0_2px_#30251F] active:scale-[0.98]"
              >
                <span className="flex w-full items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-peach">
                    <ScenarioIcon id={s.id} size={24} />
                  </span>
                  {plus && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-cream">Plus</span>}
                </span>
                <span className="mt-auto text-[17px] font-bold leading-tight">{s.short}</span>
                <span className="text-[13px] text-muted">About {MINUTES[s.id]} min</span>
              </button>
            );
          })}
          <Link
            href="/moment"
            className="flex min-h-[132px] flex-col items-start gap-2 rounded-2xl border-[1.5px] border-dashed border-field bg-paper p-4 transition duration-150 hover:border-ink active:scale-[0.98]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-peach">
              <ScenarioIcon id="custom" size={24} />
            </span>
            <span className="mt-auto text-[17px] font-bold leading-tight">Your own moment</span>
            <span className="text-[13px] text-muted">Or what you said today</span>
          </Link>
        </div>
      </section>

      {store && (store.profile || store.attempts.length > 0 || store.unlocked) && (
        <section aria-label="Start over" className="mx-auto mt-10 max-w-xl text-center">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-11 px-2 text-[15px] font-semibold text-muted underline underline-offset-[3px]"
            >
              Start over
            </button>
          ) : (
            <div role="alertdialog" aria-label="Start over?" className="anim-fade-down flex flex-col items-center gap-3 rounded-2xl bg-white p-5">
              <p className="text-[16px] font-semibold">Erase your quiz answers, practice history and plan on this device?</p>
              <p className="-mt-1 text-[13px] text-muted">You&apos;ll start fresh with the 60 second quiz. This can&apos;t be undone.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    resetStore();
                    setConfirmReset(false);
                    setOpenLesson(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Erase and start over
                </button>
                <button type="button" className="btn-ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <details className="group mx-auto mt-6 max-w-xl text-center">
        <summary className="inline-flex cursor-pointer list-none px-2 py-2.5 text-[15px] font-semibold underline underline-offset-[3px]">
          Judges: 3 minute tour
        </summary>
        <ol className="anim-fade-down mt-3 list-decimal space-y-2 rounded-2xl bg-white p-5 pl-9 text-left text-[15px] leading-relaxed text-soft-ink">
          <li>Tap <b>Get my plan in 60 seconds</b>: 7 taps shape Sam (age, boy or girl, temperament), your first focus and a reminder time.</li>
          <li>Or open a lesson under <b>Learn, then practice</b>: a 2 minute CDC-based idea, then <b>Practice it</b> with the matching moment.</li>
          <li>Reply to Sam (type or tap the mic). Sam&apos;s face and status show how it&apos;s going; the practice ends when Sam goes along, melts down or gets their way.</li>
          <li><b>See my score</b>: one thing to keep, one to change (with its CDC page), your own words improved and re-scored. Retry, see the gain, then a new situation with no tips.</li>
          <li><b>Your own moment</b> or <b>Today I lost it</b>. Typing &ldquo;I can&apos;t do this anymore&rdquo; shows the crisis safety screen.</li>
          <li><b>Your progress</b>: plan and calendar reminder; <b>See a sample week</b> shows labeled demo data. <b>Plus</b> uses Stripe test card <code className="font-mono font-semibold">{TEST_CARD}</code>.</li>
        </ol>
      </details>
    </div>
  );
}

/** A lesson that opens in place: three ideas, phrases to try, one thing to avoid, the CDC page, then practice. */
function LessonCard({
  lesson: l,
  index,
  open,
  locked,
  onToggle,
  onPractice,
}: {
  lesson: Lesson;
  index: number;
  open: boolean;
  locked: boolean;
  onToggle: () => void;
  onPractice: () => void;
}) {
  const src = lessonSource(l);
  return (
    <li
      id={`lesson-${l.id}`}
      className={`anim-rise scroll-mt-20 overflow-hidden rounded-3xl transition-colors duration-200 ${open ? "shadow-soft bg-peach" : "bg-white"}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3.5 p-4 text-left">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold ${open ? "bg-white" : "bg-peach"}`}>
          {index + 1}
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-bold leading-snug">{l.title}</span>
          <span className="text-[14px] text-muted">{l.hook}</span>
        </span>
        <ChevronDown size={20} className={`shrink-0 transition duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="anim-fade-down flex flex-col gap-4 px-4 pb-4">
          <ol className="flex flex-col gap-2.5">
            {l.points.map((p, i) => (
              <li key={i} className="anim-rise flex gap-3 text-[16px] leading-snug" style={{ animationDelay: `${60 + i * 70}ms` }}>
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange" />
                {p}
              </li>
            ))}
          </ol>

          <div className="rounded-2xl bg-white p-4">
            <span className="label-caps">Try saying</span>
            <ul className="mt-2 flex flex-col gap-2">
              {l.say.map((s) => (
                <li key={s} className="flex items-start gap-2.5">
                  <span className="shrink-0">
                    <Sam face="happy" size={26} />
                  </span>
                  <span className="text-[16px] italic leading-snug">&ldquo;{s}&rdquo;</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-2.5 text-[14px] text-soft-ink">
              <b className="text-bad">Skip:</b> {l.avoid}
            </p>
          </div>

          <a href={src.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 self-start text-[14px] font-semibold underline underline-offset-[3px]">
            <Info size={15} /> Read more: {src.name}
          </a>

          <button type="button" onClick={onPractice} className="btn-primary h-14 text-lg">
            {locked ? "Unlock to practice" : `Practice it: ${SCENARIOS[l.practice].short.toLowerCase()}`} <Arrow size={20} />
          </button>
          <p className="-mt-2 text-center text-[13px] text-muted">About {l.minutes} minutes with Sam</p>
        </div>
      )}
    </li>
  );
}
