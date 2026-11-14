"use client";

import { useSyncExternalStore } from "react";
import type { ScenarioId } from "./scenarios";
import { SCENARIO_LIST } from "./scenarios";
import { DIMENSIONS, DIMENSION_LABELS, type Dimension, type Scorecard } from "./rubric/types";
import { buildScorecard } from "./rubric/score";

export type Age = 2 | 3 | 4;
export type AttemptKind = "first" | "retry" | "transfer";

export type Turn = { parent: string; child: string | null; card: Scorecard; state?: "going_along" | "resisting" | "meltdown" | "gave_in" };

export type Attempt = {
  id: string;
  scenarioId: ScenarioId;
  kind: AttemptKind;
  turns: Turn[];
  total: number; // average of turn totals
  byDimension: Partial<Record<Dimension, number>>; // percent per dimension, averaged
  createdAt: string;
  planDay?: number;
  demo?: boolean; // sample data, labeled in the UI
  outcome?: "going_along" | "resisting" | "meltdown" | "gave_in"; // how Sam ended up
};

export type PlanDay = { day: number; scenarioId: ScenarioId; focus: Dimension; done: boolean };

export type Store = {
  sessionId: string;
  childAge: Age;
  context: string;
  current: ScenarioId | null;
  currentPlanDay: number | null;
  attempts: Attempt[];
  plan: PlanDay[];
  unlocked: boolean;
  custom?: { situation: string; said?: string }; // the parent's own moment
  profile?: Profile; // answers from the start quiz
};

/** A reminder time that lands before the hard moment the parent named. */
export const REMINDER_TIME: Record<NonNullable<Profile["when"]>, string> = {
  morning: "07:00",
  after_daycare: "16:30",
  dinner: "17:30",
  bedtime: "19:00",
  public: "10:00",
};

/** Answers from the 60 second start quiz. Nothing here identifies the parent or the child. */
export type Profile = {
  role?: "mom" | "dad" | "other";
  sex?: "boy" | "girl" | "unsaid";
  temperament?: "calm" | "active" | "fiery" | "sensitive";
  hardest?: string[]; // moments the parent picked
  usual?: "yell" | "give_in" | "threaten" | "freeze" | "calm";
  when?: "morning" | "after_daycare" | "dinner" | "bedtime" | "public";
  focus?: Dimension; // predicted weakest skill, until real practice says otherwise
};

const KEY = "ayala:v1";

function blank(): Store {
  return {
    sessionId: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
    childAge: 3,
    context: "",
    current: null,
    currentPlanDay: null,
    attempts: [],
    plan: [],
    unlocked: false,
  };
}

export function load(): Store {
  if (typeof window === "undefined") return blank();
  // Return a copy so callers can mutate it before saving.
  return structuredClone(snapshot());
}

const EVENT = "ayala:change";
let memory: string | null = null; // fallback when localStorage is unavailable

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}

export function save(s: Store) {
  const raw = JSON.stringify(s);
  memory = raw;
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    /* storage may be full or disabled; the app still works for this visit */
  }
  window.dispatchEvent(new Event(EVENT));
}

let cachedRaw: string | null | undefined;
let cachedStore: Store | null = null;

function snapshot(): Store {
  const raw = readRaw();
  if (raw !== cachedRaw || !cachedStore) {
    cachedRaw = raw;
    try {
      cachedStore = raw ? { ...blank(), ...(JSON.parse(raw) as Partial<Store>) } : blank();
    } catch {
      cachedStore = blank();
    }
  }
  return cachedStore;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The browser store, or null during server rendering. */
export function useStore(): Store | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export function update(fn: (s: Store) => Store | void): Store {
  const s = load();
  const next = fn(s) ?? s;
  save(next);
  return next;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
}

export function summarize(turns: Turn[]): { total: number; byDimension: Partial<Record<Dimension, number>> } {
  const total = Math.round(turns.reduce((s, t) => s + t.card.total, 0) / Math.max(1, turns.length));
  const byDimension: Partial<Record<Dimension, number>> = {};
  for (const d of DIMENSIONS) {
    const vals = turns
      .map((t) => t.card.byDimension[d])
      .filter((v) => v && v.max > 0)
      .map((v) => (v.earned / v.max) * 100);
    if (vals.length) byDimension[d] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return { total, byDimension };
}

/** Weakest dimension across all attempts (lowest average percent). */
export function weakestDimension(attempts: Attempt[]): Dimension | null {
  const sums: Partial<Record<Dimension, { s: number; n: number }>> = {};
  for (const a of attempts) {
    for (const [d, v] of Object.entries(a.byDimension) as [Dimension, number][]) {
      const cur = sums[d] ?? { s: 0, n: 0 };
      sums[d] = { s: cur.s + v, n: cur.n + 1 };
    }
  }
  let worst: Dimension | null = null;
  let worstAvg = Infinity;
  for (const d of DIMENSIONS) {
    const v = sums[d];
    if (!v) continue;
    const avg = v.s / v.n;
    if (avg < worstAvg) {
      worstAvg = avg;
      worst = d;
    }
  }
  return worst;
}

export const FOCUS_TIPS: Record<Dimension, string> = {
  clear_direction: "Say one short, specific direction as a statement, not a question.",
  calm_respectful: "Lower your voice. No capitals, no threats you wouldn't carry out.",
  emotional_response: "Start by naming the feeling: \"You wish you could stay.\"",
  boundaries: "State the limit calmly: \"It's time to go now.\" Then hold it.",
  positive_guidance: "Offer two choices you're happy with: \"Walk or hop?\"",
};

/** Builds a 7 day plan aimed at the weakest dimension, rotating scenarios. */
export function buildPlan(attempts: Attempt[], fallbackFocus?: Dimension): PlanDay[] {
  const focus = weakestDimension(attempts) ?? fallbackFocus ?? "emotional_response";
  const order = SCENARIO_LIST.map((s) => s.id);
  const start = attempts.length ? order.indexOf(attempts[attempts.length - 1].scenarioId) : 0;
  return Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    scenarioId: order[(Math.max(0, start) + i) % order.length],
    focus: i % 3 === 2 ? DIMENSIONS[(DIMENSIONS.indexOf(focus) + 1) % DIMENSIONS.length] : focus,
    done: false,
  }));
}

export function focusLabel(d: Dimension): string {
  return DIMENSION_LABELS[d];
}

// ---------- Demo week (FAQ Q35: demo data with time acceleration, clearly labeled) ----------

const DEMO_WEEK: { day: number; scenarioId: ScenarioId; kind: AttemptKind; text: string }[] = [
  { day: 0, scenarioId: "leaving_playground", kind: "first", text: "Come on, we're leaving NOW! Stop it!" },
  { day: 0, scenarioId: "leaving_playground", kind: "retry", text: "You wish we could stay. It's time to go now. Do you want to walk or hop to the car?" },
  { day: 1, scenarioId: "bedtime_refusal", kind: "first", text: "Can you go to bed please? Stop arguing!" },
  { day: 2, scenarioId: "bedtime_refusal", kind: "retry", text: "I know you want to keep playing. It's bedtime now. Do you want to walk to bed or hold my hand?" },
  { day: 3, scenarioId: "leaving_playground", kind: "transfer", text: "I know you love being with grandma. It's time to leave now. Shoes on, then you can carry your bag or hold my hand." },
  { day: 4, scenarioId: "bedtime_refusal", kind: "first", text: "Blocks are done for today. Pick one book or two songs." },
  { day: 6, scenarioId: "leaving_playground", kind: "first", text: "You're having so much fun. It's time to go home now. Walk or hop to the car?" },
];

/**
 * Builds a sample week of practice. Every attempt is scored by the real rubric
 * (code checks), only the dates are moved back so the jury sees a week of progress.
 */
export function demoWeekAttempts(now = Date.now()): Attempt[] {
  return DEMO_WEEK.map((d) => {
    const card = buildScorecard(d.text, d.scenarioId, null, true);
    const turns: Turn[] = [{ parent: d.text, child: null, card }];
    const { total, byDimension } = summarize(turns);
    return {
      id: newId(),
      scenarioId: d.scenarioId,
      kind: d.kind,
      turns,
      total,
      byDimension,
      createdAt: new Date(now - (6 - d.day) * 86_400_000).toISOString(),
      demo: true,
    };
  });
}

// ---------- Daily reminder (FAQ Q72/Q100: a working return mechanic) ----------

function icsDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

/** A calendar file with a daily 5 minute practice for the next 7 days, at a local time. */
export function reminderIcs(time: string, url: string, focusTip: string): string {
  const [h, m] = time.split(":").map(Number);
  const start = new Date();
  start.setHours(h, m, 0, 0);
  if (start.getTime() < Date.now()) start.setDate(start.getDate() + 1);
  const end = new Date(start.getTime() + 5 * 60_000);
  const esc = (t: string) => t.replace(/[,;\\]/g, (c) => "\\" + c);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ayala//Practice//EN",
    "BEGIN:VEVENT",
    `UID:${newId()}@ayala`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    "RRULE:FREQ=DAILY;COUNT=7",
    "SUMMARY:Ayala: 5 minute practice",
    `DESCRIPTION:${esc(`Today's focus: ${focusTip} Practice here: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Time for your 5 minute practice",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
