"use client";

import { Fragment } from "react";
import { CDC } from "@/lib/rubric/cdc";
import { DIMENSIONS, DIMENSION_LABELS, type CheckResult, type Dimension, type Scorecard } from "@/lib/rubric/types";

const CDC_URL: Record<string, string> = Object.fromEntries(Object.values(CDC).map((c) => [c.name, c.url]));

export function scoreTone(n: number): { text: string; bg: string; ring: string; label: string } {
  if (n >= 80) return { text: "text-good", bg: "bg-good-soft", ring: "#2f7d4f", label: "Strong" };
  if (n >= 55) return { text: "text-[#8a5a12]", bg: "bg-sun-soft", ring: "#d9962f", label: "Getting there" };
  return { text: "text-bad", bg: "bg-bad-soft", ring: "#b4483c", label: "Room to grow" };
}

export function ScoreRing({ value, size = 96, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(value);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} aria-label={`Score ${value} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#ece6dc" strokeWidth={8} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone.ring}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <div className={`font-bold ${size >= 90 ? "text-3xl" : "text-xl"} ${tone.text}`}>{value}</div>
        {label && <div className="mt-1 text-[11px] text-muted">{label}</div>}
      </div>
    </div>
  );
}

export function DimensionBars({ card, compare }: { card: Pick<Scorecard, "byDimension">; compare?: Pick<Scorecard, "byDimension"> }) {
  return (
    <div className="space-y-3">
      {DIMENSIONS.filter((d) => card.byDimension[d].max > 0).map((d) => {
        const v = card.byDimension[d];
        const pct = Math.round((v.earned / v.max) * 100);
        const before = compare ? Math.round((compare.byDimension[d].earned / Math.max(1, compare.byDimension[d].max)) * 100) : null;
        const ptsDelta = compare ? v.earned - compare.byDimension[d].earned : 0;
        return (
          <div key={d}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">{DIMENSION_LABELS[d]}</span>
              <span className="text-muted">
                {compare && ptsDelta !== 0 && (
                  <span className={ptsDelta > 0 ? "text-good" : "text-bad"}>
                    {ptsDelta > 0 ? "+" : ""}
                    {ptsDelta} pts ·{" "}
                  </span>
                )}
                {v.earned}/{v.max}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-[#ece6dc]">
              {before !== null && <div className="absolute h-full rounded-full bg-[#cfc6b8]" style={{ width: `${before}%` }} />}
              <div className="absolute h-full rounded-full bg-calm transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Highlights each quoted piece of evidence in the parent's text. */
export function Highlighted({ text, checks }: { text: string; checks: CheckResult[] }) {
  const marks: { start: number; end: number; good: boolean }[] = [];
  for (const c of checks) {
    if (!c.evidence) continue;
    for (const part of c.evidence.split(" … ")) {
      const i = text.indexOf(part);
      if (i >= 0 && part.length > 1) marks.push({ start: i, end: i + part.length, good: c.passed });
    }
  }
  // Red wins over green: place problems first, then praise that doesn't overlap them.
  const merged: typeof marks = [];
  for (const m of [...marks.filter((x) => !x.good), ...marks.filter((x) => x.good)]) {
    if (merged.some((x) => m.start < x.end && x.start < m.end)) continue;
    merged.push(m);
  }
  merged.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let pos = 0;
  merged.forEach((m, i) => {
    if (m.start > pos) out.push(<Fragment key={`t${i}`}>{text.slice(pos, m.start)}</Fragment>);
    out.push(
      <mark key={`m${i}`} className={m.good ? "good" : "bad"}>
        {text.slice(m.start, m.end)}
      </mark>,
    );
    pos = m.end;
  });
  if (pos < text.length) out.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <>{out}</>;
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
          <span className="font-medium">{c.label}</span>
          <span className="text-xs text-muted">
            {c.points}/{c.maxPoints} pts
          </span>
        </div>
        {c.evidence && (
          <p className={`mt-1 text-sm italic ${c.passed ? "text-good" : "text-bad"}`}>&ldquo;{c.evidence}&rdquo;</p>
        )}
        <p className="mt-1 text-sm text-muted">{c.explanation}</p>
        <p className="mt-1 text-[11px] text-muted/80">
          {c.source === "code" ? "Checked by code" : "Checked by AI, quote verified"} ·{" "}
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="underline">
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

export function ScorecardView({ card, text }: { card: Scorecard; text: string }) {
  const byDim = (d: Dimension) => card.checks.filter((c) => c.dimension === d);
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-cream p-4 text-[15px] leading-relaxed">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">You said</span>
        <p className="mt-1">
          <Highlighted text={text} checks={card.checks} />
        </p>
      </div>
      {card.notes.length > 0 && (
        <ul className="space-y-2">
          {card.notes.map((n) => (
            <li key={n} className="rounded-xl bg-sun-soft px-4 py-2 text-sm text-[#7a4f10]">
              {n}
            </li>
          ))}
        </ul>
      )}
      {DIMENSIONS.filter((d) => byDim(d).length).map((d) => (
        <details key={d} className="group rounded-xl border border-line bg-white px-4" open={byDim(d).some((c) => !c.passed)}>
          <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold">
            <span>{DIMENSION_LABELS[d]}</span>
            <span className="text-sm font-normal text-muted">
              {card.byDimension[d].earned}/{card.byDimension[d].max}
              <span className="ml-2 inline-block transition group-open:rotate-90">›</span>
            </span>
          </summary>
          <ul className="pb-2">
            {byDim(d).map((c) => (
              <CheckRow key={c.id} c={c} />
            ))}
          </ul>
        </details>
      ))}
      {card.degraded && (
        <p className="text-xs text-muted">
          Quick mode: the AI check was unavailable, so this score uses the code checks only.
        </p>
      )}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-calm border-t-transparent" />
      {label}
    </span>
  );
}
