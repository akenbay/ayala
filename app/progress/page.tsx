"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import { DIMENSION_LABELS, DIMENSIONS } from "@/lib/rubric/types";
import { FOCUS_TIPS, buildPlan, demoWeekAttempts, focusLabel, reminderIcs, update, useStore, weakestDimension } from "@/lib/storage";
import { scoreTone } from "@/components/ui";

const KIND_LABEL = { first: "First try", retry: "Retry", transfer: "On your own" } as const;

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 300;
  const h = 70;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - (v / 100) * (h - 8) - 4]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full" aria-label="Score history">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#2f6f6a" strokeWidth={2.5} strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="#2f6f6a" />
      ))}
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

function Reminder({ tip }: { tip: string }) {
  const [time, setTime] = useState("19:30");
  const [saved, setSaved] = useState(false);
  function download() {
    const ics = reminderIcs(time, window.location.origin, tip);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "calmrehearsal-daily-practice.ics";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }
  return (
    <div className="card">
      <p className="font-semibold">Daily reminder</p>
      <p className="mt-1 text-sm text-muted">
        Pick a time before the hard moment (say, before daycare pickup). We add a 5 minute practice to your calendar for the next 7 days, with today&apos;s focus. No account needed.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="rt" className="sr-only">Reminder time</label>
        <input id="rt" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2.5" />
        <button className="btn-primary" onClick={download}>Add to my calendar</button>
        {saved && <span className="text-sm text-good">Calendar file downloaded. Open it to add the reminder.</span>}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const router = useRouter();
  const store = useStore();

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
      <div className="card text-center">
        <h1 className="text-xl font-bold">No practice yet</h1>
        <p className="mt-2 text-muted">Do one two minute practice and your progress and 7 day plan appear here.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn-primary">
            Start practicing
          </Link>
          <button className="btn-ghost" onClick={loadDemoWeek}>
            See a sample week (demo)
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">The sample week is labeled demo data, scored by the real rubric with dates moved back.</p>
      </div>
    );
  }

  const weakest = weakestDimension(store.attempts);
  const recent = [...store.attempts].reverse();
  const best = Math.max(...store.attempts.map((a) => a.total));
  const days = new Set(store.attempts.map((a) => a.createdAt.slice(0, 10))).size;

  const avgByDim = DIMENSIONS.map((d) => {
    const vals = store.attempts.map((a) => a.byDimension[d]).filter((v): v is number => typeof v === "number");
    return { d, avg: vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : null };
  });

  function startDay(day: number) {
    const p = store!.plan.find((x) => x.day === day)!;
    if ((day > 1 || !SCENARIOS[p.scenarioId].free) && !store!.unlocked) {
      router.push("/pricing?from=plan");
      return;
    }
    update((s) => {
      s.current = p.scenarioId;
      s.currentPlanDay = day;
    });
    router.push("/practice");
  }

  function rebuild() {
    update((x) => {
      x.plan = buildPlan(x.attempts);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Your progress</h1>
        {!store.attempts.some((a) => a.demo) && (
          <button className="text-sm text-calm underline" onClick={loadDemoWeek}>
            See a sample week (demo)
          </button>
        )}
      </div>
      {store.attempts.some((a) => a.demo) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sun-soft px-4 py-3 text-sm text-[#7a4f10]">
          <span>
            <b>Demo data:</b> a sample week, scored by the real rubric with dates moved back so you can see progress over time.
          </span>
          <button className="underline" onClick={clearDemo}>
            Remove demo data
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Practice rounds", store.attempts.length],
          ["Best score", best],
          ["Days practiced", days],
        ].map(([l, v]) => (
          <div key={l as string} className="card p-4 text-center">
            <p className="text-2xl font-bold">{v}</p>
            <p className="text-xs text-muted">{l}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="font-semibold">Score history</p>
        <Sparkline values={store.attempts.map((a) => a.total)} />
        <ul className="mt-2 divide-y divide-line text-sm">
          {recent.slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate">
                {a.demo && <span className="mr-1 rounded bg-sun-soft px-1.5 py-0.5 text-[10px] font-semibold text-[#8a5a12]">DEMO</span>}
                <b>{KIND_LABEL[a.kind]}</b> · {a.kind === "transfer" ? SCENARIOS[a.scenarioId].transfer.title : SCENARIOS[a.scenarioId].short}
                <span className="block truncate text-xs text-muted">&ldquo;{a.turns[0]?.parent}&rdquo;</span>
              </span>
              <span className={`shrink-0 font-semibold ${scoreTone(a.total).text}`}>{a.total}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <p className="font-semibold">Skills</p>
        <div className="mt-3 space-y-3">
          {avgByDim
            .filter((x) => x.avg !== null)
            .map(({ d, avg }) => (
              <div key={d}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={d === weakest ? "font-semibold text-bad" : "font-medium"}>
                    {DIMENSION_LABELS[d]} {d === weakest && "· weakest"}
                  </span>
                  <span className="text-muted">{avg}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#ece6dc]">
                  <div className={`h-full rounded-full ${d === weakest ? "bg-bad" : "bg-calm"}`} style={{ width: `${avg}%` }} />
                </div>
              </div>
            ))}
        </div>
        {weakest && <p className="mt-3 rounded-xl bg-sun-soft px-4 py-2 text-sm text-[#7a4f10]">Tip: {FOCUS_TIPS[weakest]}</p>}
      </div>

      <Reminder tip={FOCUS_TIPS[weakest ?? "emotional_response"]} />

      <div className="card">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Your 7 day plan</p>
          <button className="text-sm text-calm underline" onClick={rebuild}>
            Refresh for my weakest skill
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">One short practice a day. Day 1 is free; the rest come with Plus.</p>
        <ol className="mt-3 space-y-2">
          {store.plan.map((p) => {
            const locked = (p.day > 1 || !SCENARIOS[p.scenarioId].free) && !store.unlocked;
            return (
              <li key={p.day} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Day {p.day}: {SCENARIOS[p.scenarioId].short}
                  </p>
                  <p className="text-xs text-muted">Focus: {focusLabel(p.focus).toLowerCase()}</p>
                </div>
                {p.done ? (
                  <span className="shrink-0 rounded-full bg-good-soft px-3 py-1 text-xs font-semibold text-good">Done ✓</span>
                ) : (
                  <button className={locked ? "btn-ghost shrink-0 px-3 py-2 text-sm" : "btn-primary shrink-0 px-3 py-2 text-sm"} onClick={() => startDay(p.day)}>
                    {locked ? "🔒 Plus" : "Start"}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
