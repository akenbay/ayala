"use client";

import { Fragment, useEffect, useState } from "react";
import { CDC } from "@/lib/rubric/cdc";
import { DIMENSIONS, DIMENSION_LABELS, type CheckResult, type Dimension, type Scorecard } from "@/lib/rubric/types";

export const CDC_URL: Record<string, string> = Object.fromEntries(Object.values(CDC).map((c) => [c.name, c.url]));

export function scoreTone(n: number): { text: string; bg: string; ring: string; label: string } {
  if (n >= 80) return { text: "text-good", bg: "bg-good-soft", ring: "#2E7D4F", label: "Strong" };
  if (n >= 55) return { text: "text-ink", bg: "bg-peach", ring: "#FFB41D", label: "Getting there" };
  return { text: "text-bad", bg: "bg-bad-soft", ring: "#E5484D", label: "Room to grow" };
}

export function ScoreRing({ value, size = 168, sub = "out of 100" }: { value: number; size?: number; sub?: string | null }) {
  const stroke = size >= 120 ? 14 : 8;
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(value);
  const big = size >= 120;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`Score ${value} out of 100`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#F3E4C3" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone.ring}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="anim-ring"
          style={{ transition: "stroke-dashoffset 600ms ease", ["--ring-c" as string]: c }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className={`font-extrabold tracking-[-0.03em] tabular-nums ${big ? "text-[60px]" : size >= 80 ? "text-[28px]" : "text-xl"}`}>
          <CountUp value={value} />
        </span>
        {big && sub && <span className="mt-1 text-sm font-semibold text-muted">{sub}</span>}
      </div>
    </div>
  );
}

/** Counts up to a number in about half a second. Shows the final number at once with reduced motion. */
export function CountUp({ value, ms = 550, from = 0 }: { value: number; ms?: number; from?: number }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = reduce ? 1 : Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, from]);
  return <>{n}</>;
}

/** One quiet burst of small amber sparkles, for the moment the score improves. */
export function Sparkles({ count = 8 }: { count?: number }) {
  const parts = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const dist = 46 + (i % 2) * 14;
    return { dx: Math.round(Math.cos(angle) * dist), dy: Math.round(Math.sin(angle) * dist), delay: (i % 3) * 60 };
  });
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {parts.map((p, i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="anim-sparkle absolute -left-1.5 -top-1.5"
          style={{ ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`, animationDelay: `${p.delay}ms` }}
        >
          <path d="M6 0l1.4 4.6L12 6l-4.6 1.4L6 12l-1.4-4.6L0 6l4.6-1.4z" fill={i % 2 ? "#FFC146" : "#FFB41D"} />
        </svg>
      ))}
    </span>
  );
}

/** Five skill bars. The weakest one is called out in orange. */
export function DimensionBars({ card, compare }: { card: Pick<Scorecard, "byDimension">; compare?: Pick<Scorecard, "byDimension"> }) {
  const dims = DIMENSIONS.filter((d) => card.byDimension[d].max > 0);
  const pct = (d: Dimension) => Math.round((card.byDimension[d].earned / card.byDimension[d].max) * 100);
  const min = Math.min(...dims.map(pct));
  return (
    <ul className="space-y-3.5">
      {dims.map((d) => {
        const v = card.byDimension[d];
        const p = pct(d);
        const weak = p === min && min < 100;
        const before = compare ? Math.round((compare.byDimension[d].earned / Math.max(1, compare.byDimension[d].max)) * 100) : null;
        const delta = compare ? v.earned - compare.byDimension[d].earned : 0;
        return (
          <li key={d}>
            <div className="mb-1.5 flex justify-between text-[15px]">
              <span className={weak ? "font-bold" : "font-medium"}>
                {DIMENSION_LABELS[d]}
                {weak && !compare && " (practice next)"}
              </span>
              <span className="font-bold">
                {compare && delta !== 0 && (
                  <span className={`mr-1.5 font-semibold ${delta > 0 ? "text-good" : "text-bad"}`}>
                    {delta > 0 ? "+" : ""}
                    {delta} pts
                  </span>
                )}
                {v.earned}/{v.max}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-track" role="img" aria-label={`${DIMENSION_LABELS[d]}: ${p} out of 100`}>
              {before !== null && <div className="absolute h-full rounded-full bg-field" style={{ width: `${before}%` }} />}
              <div
                className={`absolute h-full rounded-full transition-all duration-500 ${weak && !compare ? "bg-orange" : "bg-ink"}`}
                style={{ width: `${p}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type Mark = { start: number; end: number; good: boolean; check: CheckResult };

/** Finds each quoted piece of evidence in the parent's text. Problems win over praise when they overlap. */
export function findMarks(text: string, checks: CheckResult[]): Mark[] {
  const marks: Mark[] = [];
  for (const c of checks) {
    if (!c.evidence) continue;
    for (const part of c.evidence.split(" … ")) {
      const i = text.indexOf(part);
      if (i >= 0 && part.length > 1) marks.push({ start: i, end: i + part.length, good: c.passed, check: c });
    }
  }
  const merged: Mark[] = [];
  for (const m of [...marks.filter((x) => !x.good), ...marks.filter((x) => x.good)]) {
    if (merged.some((x) => m.start < x.end && x.start < m.end)) continue;
    merged.push(m);
  }
  return merged.sort((a, b) => a.start - b.start);
}

/** The parent's words with helped and hurt phrases marked. Pass onPick to make the marks tappable. */
export function Highlighted({
  text,
  checks,
  picked,
  onPick,
}: {
  text: string;
  checks: CheckResult[];
  picked?: number;
  onPick?: (index: number, mark: Mark) => void;
}) {
  const merged = findMarks(text, checks);
  const out: React.ReactNode[] = [];
  let pos = 0;
  merged.forEach((m, i) => {
    if (m.start > pos) out.push(<Fragment key={`t${i}`}>{text.slice(pos, m.start)}</Fragment>);
    const slice = text.slice(m.start, m.end);
    out.push(
      onPick ? (
        <button
          key={`m${i}`}
          type="button"
          className={m.good ? "mark-good" : "mark-bad"}
          aria-pressed={picked === i}
          aria-label={`${slice}: ${m.good ? "helped" : "hurt"}. Show why.`}
          onClick={() => onPick(i, m)}
        >
          {slice}
        </button>
      ) : (
        <mark key={`m${i}`} className={m.good ? "good" : "bad"}>
          {slice}
        </mark>
      ),
    );
    pos = m.end;
  });
  if (pos < text.length) out.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <>{out}</>;
}

export function Legend({ hint }: { hint?: string }) {
  return (
    <div className="flex items-center gap-4 text-sm text-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-3 w-[18px] rounded-[3px] border-b-[2.5px] border-good-line bg-good-soft" />
        Helped
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="font-bold text-ink underline decoration-red decoration-wavy decoration-2 underline-offset-4">
          abc
        </span>
        Hurt
      </span>
      {hint && <span className="ml-auto">{hint}</span>}
    </div>
  );
}

export function CheckRow({ c }: { c: CheckResult }) {
  const url = CDC_URL[c.cdcBasis];
  return (
    <li className="flex gap-3 border-t border-line py-3 first:border-t-0">
      <span
        aria-hidden
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
          c.passed ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
        }`}
      >
        {c.passed ? "✓" : "✕"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-semibold">{c.label}</span>
          <span className="text-xs text-muted">
            {c.points}/{c.maxPoints} pts
          </span>
        </div>
        {c.evidence && <p className={`mt-1 text-sm italic ${c.passed ? "text-good" : "text-bad"}`}>&ldquo;{c.evidence}&rdquo;</p>}
        <p className="mt-1 text-sm text-soft-ink">{c.explanation}</p>
        <p className="mt-1 text-xs text-muted">
          {c.source === "code" ? "Checked by code" : "Checked by AI, quote verified"} ·{" "}
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {c.cdcBasis}
            </a>
          ) : (
            c.cdcBasis
          )}
        </p>
      </div>
    </li>
  );
}

/** Every check, grouped by skill. Used inside the collapsed "See full breakdown". */
export function CheckList({ card }: { card: Scorecard }) {
  const byDim = (d: Dimension) => card.checks.filter((c) => c.dimension === d);
  return (
    <div className="space-y-3">
      {card.notes.length > 0 && (
        <ul className="space-y-2">
          {card.notes.map((n) => (
            <li key={n} className="rounded-xl bg-peach px-4 py-2.5 text-sm">
              {n}
            </li>
          ))}
        </ul>
      )}
      {DIMENSIONS.filter((d) => byDim(d).length).map((d) => (
        <div key={d} className="rounded-2xl bg-white px-4 pt-3">
          <p className="flex justify-between font-bold">
            <span>{DIMENSION_LABELS[d]}</span>
            <span className="text-sm font-semibold text-muted">
              {card.byDimension[d].earned}/{card.byDimension[d].max}
            </span>
          </p>
          <ul className="pb-1">
            {byDim(d).map((c) => (
              <CheckRow key={c.id} c={c} />
            ))}
          </ul>
        </div>
      ))}
      {card.degraded && <p className="text-xs text-muted">Quick mode: the AI check was unavailable, so this score uses the code checks only.</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      {label}
    </span>
  );
}

export function TypingDots() {
  return (
    <span className="flex items-center gap-1.5" aria-hidden>
      <span className="typing-dot h-[9px] w-[9px] rounded-full bg-ink" />
      <span className="typing-dot h-[9px] w-[9px] rounded-full bg-ink" style={{ animationDelay: "0.15s" }} />
      <span className="typing-dot h-[9px] w-[9px] rounded-full bg-ink" style={{ animationDelay: "0.3s" }} />
    </span>
  );
}
