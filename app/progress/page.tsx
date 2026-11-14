"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import { DIMENSION_LABELS, DIMENSIONS } from "@/lib/rubric/types";
import { GUARANTEE, PLANS } from "@/lib/pricing";
import { FOCUS_TIPS, REMINDER_TIME, buildPlan, demoWeekAttempts, focusLabel, reminderIcs, update, useStore, weakestDimension } from "@/lib/storage";
import { Arrow, Bell, Calendar, Check, ChevronDown } from "@/components/icons";
import { Sam } from "@/components/Sam";

const KIND_LABEL = { first: "First try", retry: "With the tip", transfer: "On your own" } as const;

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-10" />;
  const w = 140;
  const h = 48;
  const pts = values.map((v, i) => [4 + (i / (values.length - 1)) * (w - 8), h - 4 - (v / 100) * (h - 8)]);
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" height="40" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Scores over ${values.length} practices`}>
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="#1C1608"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={4} fill="#2E7D4F" />
    </svg>
  );
}

function loadDemoWeek() {
  update((s) => {
    s.attempts = [...s.attempts.filter((a) => !a.demo), ...demoWeekAttempts()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    s.plan = buildPlan(s.attempts).map((p) => (p.day <= 3 ? { ...p, done: true } : p));
  });
}

function clearDemo() {
  update((s) => {
    s.attempts = s.attempts.filter((a) => !a.demo);
    s.plan = s.attempts.length ? buildPlan(s.attempts) : [];
  });
}

function Reminder({ tip, defaultTime }: { tip: string; defaultTime?: string }) {
  const [time, setTime] = useState(defaultTime ?? "19:30");
  const [saved, setSaved] = useState(false);
  function download() {
    const ics = reminderIcs(time, window.location.origin, tip);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ayala-daily-practice.ics";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }
  return (
    <section aria-label="Daily reminder" className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream">
        <Bell size={20} />
      </span>
      <label htmlFor="remindTime" className="flex-1 text-[17px] font-bold">
        Remind me daily
      </label>
      <input
        id="remindTime"
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="h-11 rounded-xl border-[1.5px] border-field bg-cream px-2.5 text-base font-semibold"
      />
      <button
        type="button"
        onClick={download}
        className="flex min-h-11 w-full items-center gap-1.5 pl-[52px] text-[15px] font-semibold underline underline-offset-[3px]"
      >
        <Calendar size={16} /> {saved ? "Downloaded. Open the file to add it." : "Add to my calendar"}
      </button>
    </section>
  );
}

export default function ProgressPage() {
  const router = useRouter();
  const store = useStore();
  const [showAll, setShowAll] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Create the plan once there is practice history.
  useEffect(() => {
    if (store && store.attempts.length && !store.plan.length) {
      update((s) => {
        s.plan = buildPlan(s.attempts);
      });
    }
  }, [store]);

  if (!store) return null;

  if (!store.attempts.length) {
    return (
      <div className="mx-auto max-w-xl py-6">
        <h1 className="font-display text-[30px]">Your progress</h1>
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center">
          <h2 className="text-xl font-extrabold">No practice yet</h2>
          <p className="text-[17px] text-muted">Do one 2 minute practice and your progress and 7 day plan appear here.</p>
          <Link href="/" className="btn-primary mt-2 w-full">
            Start practicing <Arrow size={20} />
          </Link>
          <button type="button" className="btn-ghost w-full" onClick={loadDemoWeek}>
            See a sample week (demo)
          </button>
          <p className="text-xs text-muted">The sample week is labeled demo data, scored by the real rubric with dates moved back.</p>
        </div>
      </div>
    );
  }

  const weakest = weakestDimension(store.attempts);
  const recent = [...store.attempts].reverse();
  const isDemo = store.attempts.some((a) => a.demo);

  // Days practiced in the last 7 days, oldest first.
  const today = new Date();
  const daySet = new Set(store.attempts.map((a) => new Date(a.createdAt).toDateString()));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return daySet.has(d.toDateString());
  });
  const weekDays = week.filter(Boolean).length;
  const totals = store.attempts.map((a) => a.total);
  const latest = totals[totals.length - 1];
  const trend = latest - totals[0];

  const avgByDim = DIMENSIONS.map((d) => {
    const vals = store.attempts.map((a) => a.byDimension[d]).filter((v): v is number => typeof v === "number");
    return { d, avg: vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : null };
  })
    .filter((x): x is { d: (typeof DIMENSIONS)[number]; avg: number } => x.avg !== null)
    .sort((a, b) => (a.d === weakest ? 1 : b.d === weakest ? -1 : b.avg - a.avg));

  const next = store.plan.find((p) => !p.done);
  const isLocked = (day: number, free: boolean) => (day > 1 || !free) && !store.unlocked;

  function startDay(day: number) {
    const p = store!.plan.find((x) => x.day === day)!;
    if (isLocked(day, SCENARIOS[p.scenarioId].free)) {
      router.push("/pricing?from=plan");
      return;
    }
    update((s) => {
      s.current = p.scenarioId;
      s.currentPlanDay = day;
    });
    router.push("/practice");
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-[18px] py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-[30px]">Your progress</h1>
        {!isDemo && (
          <button type="button" className="min-h-11 text-[15px] font-semibold underline underline-offset-[3px]" onClick={loadDemoWeek}>
            See a sample week (demo)
          </button>
        )}
      </div>

      {isDemo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-peach px-4 py-3 text-[15px]">
          <span>
            <b>Demo data:</b> a sample week, scored by the real rubric with dates moved back.
          </span>
          <button type="button" className="font-semibold underline underline-offset-2" onClick={clearDemo}>
            Remove demo data
          </button>
        </div>
      )}

      <div className="anim-rise flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
        <div>
          <span className="text-sm font-semibold text-muted">This week</span>
          <p className="text-[28px] font-extrabold leading-none">
            {weekDays} <span className="text-base font-semibold">{weekDays === 1 ? "day" : "days"} practiced</span>
          </p>
        </div>
        <div role="img" aria-label={`Practiced on ${weekDays} of the last 7 days`} className="grid grid-cols-7 gap-1.5">
          {week.map((on, i) => (
            <span key={i} className={`h-4 w-4 rounded-full ${on ? "anim-pop bg-orange" : "bg-line"}`} style={on ? { animationDelay: `${i * 50}ms` } : undefined} />
          ))}
        </div>
      </div>

      {next && (
        <section aria-label="Today's plan step" className="anim-rise flex flex-col gap-2.5 rounded-3xl bg-peach p-5">
          <div className="flex items-center justify-between">
            <span className="label-caps text-amber-text">Today, day {next.day} of 7</span>
            <Sam face="resisting" size={56} />
          </div>
          <h2 className="font-display text-[26px] leading-tight">
            {SCENARIOS[next.scenarioId].short}: {focusLabel(next.focus).toLowerCase()}
          </h2>
          <p className="text-[17px] leading-snug">{FOCUS_TIPS[next.focus]}</p>
          <button type="button" className="btn-primary mt-1.5 h-14 text-lg" onClick={() => startDay(next.day)}>
            {isLocked(next.day, SCENARIOS[next.scenarioId].free) ? "Unlock with Plus" : "Start"} <Arrow size={20} />
          </button>
        </section>
      )}

      <Reminder
        tip={FOCUS_TIPS[weakest ?? store.profile?.focus ?? "emotional_response"]}
        defaultTime={store.profile?.when ? REMINDER_TIME[store.profile.when] : undefined}
      />

      <section className="border-t border-line pt-1">
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
          className="flex h-[52px] w-full items-center justify-between px-0.5 text-base font-semibold"
        >
          Skills, plan and history
          <ChevronDown size={20} className={`transition ${showMore ? "rotate-180" : ""}`} />
        </button>
        {showMore && (
          <div className="anim-fade-down flex flex-col gap-[18px] pb-2">
        <div className="flex flex-col gap-2.5 rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-muted">Score trend</span>
          <span className="text-[30px] font-extrabold leading-none">
            {latest}{" "}
            {trend !== 0 && (
              <span className={`text-[15px] font-bold ${trend > 0 ? "text-good" : "text-bad"}`}>
                {trend > 0 ? "+" : "−"}
                {Math.abs(trend)}
              </span>
            )}
          </span>
          <Sparkline values={totals.slice(-10)} />
        </div>
      <section aria-label="Skills" className="flex flex-col gap-3.5 rounded-2xl bg-white p-[18px]">
        <h2 className="text-[19px] font-extrabold">Your skills</h2>
        <ul className="flex flex-col gap-3">
          {avgByDim.map(({ d, avg }) =>
            d === weakest ? (
              <li key={d} className="-mx-3 flex flex-col gap-2 rounded-xl bg-peach-soft p-3">
                <div className="flex items-center justify-between text-base">
                  <span className="font-extrabold">{DIMENSION_LABELS[d]}</span>
                  <span className="rounded-full bg-ink px-2.5 py-0.5 text-[13px] font-extrabold text-cream">Practice next</span>
                </div>
                <div role="img" aria-label={`${DIMENSION_LABELS[d]} ${avg} of 100, your weakest skill`} className="h-2 rounded-full bg-butter/50">
                  <div className="h-2 rounded-full bg-orange" style={{ width: `${avg}%` }} />
                </div>
                <span className="text-[15px] text-soft-ink">{FOCUS_TIPS[d]}</span>
              </li>
            ) : (
              <li key={d} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-base">
                  <span>{DIMENSION_LABELS[d]}</span>
                  <span className="font-bold">{avg >= 80 ? "Strong" : avg >= 50 ? "Growing" : "Starting"}</span>
                </div>
                <div role="img" aria-label={`${DIMENSION_LABELS[d]} ${avg} of 100`} className="h-2 rounded-full bg-track">
                  <div className="h-2 rounded-full bg-ink" style={{ width: `${avg}%` }} />
                </div>
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-[18px]">
        <h2 className="text-[19px] font-extrabold">Your 7 day plan</h2>
        <p className="mt-1 text-[15px] text-muted">One short practice a day. Day 1 is free, the rest come with Plus.</p>
        <ol className="mt-3 flex flex-col gap-2">
          {store.plan.map((p) => {
            const locked = isLocked(p.day, SCENARIOS[p.scenarioId].free);
            return (
              <li key={p.day} className="flex items-center justify-between gap-3 rounded-xl bg-cream px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold">
                    Day {p.day}: {SCENARIOS[p.scenarioId].short}
                  </p>
                  <p className="text-[13px] text-muted">Focus: {focusLabel(p.focus).toLowerCase()}</p>
                </div>
                {p.done ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-good-soft px-3 py-1 text-[13px] font-bold text-good">
                    <Check size={12} /> Done
                  </span>
                ) : locked ? (
                  <button type="button" className="shrink-0 rounded-full bg-ink px-3 py-1 text-[13px] font-bold text-cream" onClick={() => startDay(p.day)}>
                    Plus
                  </button>
                ) : (
                  <button type="button" className="btn-orange min-h-9 shrink-0 px-4 py-1.5 text-sm" onClick={() => startDay(p.day)}>
                    Start
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl bg-white p-[18px]">
        <h2 className="text-[19px] font-extrabold">History</h2>
        <ul className="mt-2 divide-y divide-line">
          {recent.slice(0, showAll ? 30 : 4).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[15px] font-bold">
                  {a.demo && <span className="rounded bg-peach px-1.5 py-0.5 text-[10px] font-bold">DEMO</span>}
                  {KIND_LABEL[a.kind]} · {a.kind === "transfer" ? SCENARIOS[a.scenarioId].transfer.title : SCENARIOS[a.scenarioId].short}
                </span>
                <span className="block truncate text-[13px] text-muted">&ldquo;{a.turns[0]?.parent}&rdquo;</span>
              </span>
              <span className="shrink-0 text-lg font-extrabold">{a.total}</span>
            </li>
          ))}
        </ul>
        {recent.length > 4 && (
          <button
            type="button"
            className="mt-1 flex min-h-11 items-center gap-1 text-[15px] font-semibold"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show less" : `Show all ${recent.length}`} <ChevronDown size={18} className={showAll ? "rotate-180" : ""} />
          </button>
        )}
      </section>

          </div>
        )}
      </section>

      {!store.unlocked && (
        <section aria-label="Ayala Plus" className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-[18px]">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-cream">Plus</span>
            <span className="text-[17px] font-extrabold">All scenarios and the full 7 day plan</span>
          </div>
          <p className="text-base text-soft-ink">
            <b className="text-ink">From {PLANS.annual.perMonth}</b> billed yearly, or {PLANS.monthly.label}. {GUARANTEE}.
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-[13px] text-muted">Test mode, no real charge</span>
            <Link href="/pricing" className="btn-ghost">
              See Plus
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
