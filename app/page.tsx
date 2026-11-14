"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SCENARIOS, SCENARIO_LIST } from "@/lib/scenarios";
import { LESSONS, lessonForSkill } from "@/lib/lessons";
import { focusLabel, resetStore, useStore, weakestDimension } from "@/lib/storage";
import { TEST_CARD } from "@/lib/pricing";
import { Arrow, Bolt, Check, ScenarioIcon } from "@/components/icons";
import { HomeCheck } from "@/components/PhraseBank";
import { useStartPractice } from "@/components/useStartPractice";

export default function Home() {
  const router = useRouter();
  const store = useStore();
  const start = useStartPractice();
  const [confirmReset, setConfirmReset] = useState(false);
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
      // Practicing also counts, so the path never sends a parent backwards when their focus skill changes.
      done: read.includes(focusLesson.id) || real.some((a) => a.kind === "first"),
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
      title: "Bring the next hard moment here",
      detail: "Use Help me now in the moment, or practice what really happened today.",
      done: real.some((a) => a.scenarioId === "custom") || (store?.helpUses?.length ?? 0) > 0,
      go: () => router.push("/moment"),
      cta: "Practice my own moment",
    },
  ];
  const current = steps.findIndex((x) => !x.done);

  function openLessonCard(id: string) {
    router.push(`/learn?open=${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* PART 1. About: what Ayala is, who it's for, and your path */}
      <section id="about" aria-label="About Ayala" className="scroll-mt-36 pt-5 sm:pt-10">
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

        <Link
          href="/help"
          className="anim-rise mx-auto mt-5 flex max-w-xl items-center gap-4 rounded-3xl bg-ink px-5 py-4 text-cream shadow-soft transition active:scale-[0.99]"
          style={{ animationDelay: "90ms" }}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange text-ink">
            <Bolt size={24} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[19px] font-extrabold leading-tight">What do I say right now?</span>
            <span className="text-[14px] text-cream/80">A meltdown is happening. One tap, three lines to say.</span>
          </span>
          <Arrow size={20} />
        </Link>

        <div className="anim-rise mx-auto mt-6 max-w-xl rounded-3xl bg-white p-5 shadow-soft" style={{ animationDelay: "100ms" }}>
          <p className="text-[13px] font-bold uppercase tracking-wide text-amber-text">What is Ayala</p>
          <p className="mt-1.5 text-[16px] font-semibold leading-snug">
            A speaking gym for parents of 2 to 4 year olds. Tantrums go better when the right words are already ready, so here you say them out loud a few times first.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { h: "Learn", t: "Short ideas from CDC parenting guidance, with the source linked." },
              { h: "Practice", t: "Stories with Sam, a pretend toddler who reacts to your words." },
              { h: "Improve", t: "What worked, one thing to change, and your best words saved for next time." },
            ].map((x, i) => (
              <li key={x.h} className="flex gap-3 sm:flex-col sm:gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-peach text-[14px] font-extrabold">{i + 1}</span>
                <span>
                  <span className="block text-[15px] font-bold">{x.h}</span>
                  <span className="block text-[14px] leading-snug text-muted">{x.t}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">Practice before the hard moments, get words during them. No account, everything stays on your phone.</p>
        </div>

        <div className="anim-rise mx-auto mt-5 flex max-w-md flex-col gap-3" style={{ animationDelay: "120ms" }}>
          <HomeCheck />
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

      {/* Your path: what to do first, then next (still part of About) */}
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

      {/* Where to go next: the other parts of Ayala, each on its own page */}
      <section aria-labelledby="parts-h" className="mt-10">
        <h2 id="parts-h" className="font-display text-[24px]">
          Explore Ayala
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Link href="/moment" className="flex flex-col gap-1.5 rounded-3xl bg-peach p-5 shadow-soft transition active:scale-[0.99] sm:col-span-3">
            <span className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <ScenarioIcon id="custom" size={22} />
              </span>
              <span className="text-[19px] font-extrabold">Your own moment</span>
            </span>
            <span className="text-[15px] text-soft-ink">Describe what really happens at home, or what you said today, and practice it with Sam.</span>
          </Link>
          <Link href="/stories" className="flex flex-col gap-1 rounded-2xl bg-white p-4 transition active:scale-[0.99]">
            <span className="text-[17px] font-bold">Stories with Sam</span>
            <span className="text-[14px] text-muted">{SCENARIO_LIST.length} everyday moments, from bedtime to the car seat.</span>
          </Link>
          <Link href="/learn" className="flex flex-col gap-1 rounded-2xl bg-white p-4 transition active:scale-[0.99]">
            <span className="text-[17px] font-bold">Learn</span>
            <span className="text-[14px] text-muted">{LESSONS.length} short lessons from CDC guidance.</span>
          </Link>
          <Link href="/help" className="flex flex-col gap-1 rounded-2xl bg-white p-4 transition active:scale-[0.99]">
            <span className="text-[17px] font-bold">Help me now</span>
            <span className="text-[14px] text-muted">Three lines to say during a meltdown.</span>
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
          <li>Or open a lesson under <b>Learn</b>: a 2 minute CDC-based idea, then <b>Practice it</b> with the matching moment.</li>
          <li>Reply to Sam (type or tap the mic). Sam&apos;s face and status show how it&apos;s going; the practice ends when Sam goes along, melts down or gets their way.</li>
          <li><b>See my score</b>: one thing to keep, one to change (with its CDC page), your own words improved and re-scored. Retry, see the gain, then a new situation with no tips.</li>
          <li><b>What do I say right now?</b>: one tap, a short script, no score. Saved phrases show first.</li>
          <li><b>Your own moment</b> or <b>Today I lost it</b>. Typing &ldquo;I can&apos;t do this anymore&rdquo; shows the crisis safety screen.</li>
          <li><b>Your progress</b>: plan and calendar reminder; <b>See a sample week</b> shows labeled demo data. <b>Plus</b> uses Stripe test card <code className="font-mono font-semibold">{TEST_CARD}</code>.</li>
        </ol>
      </details>
    </div>
  );
}
