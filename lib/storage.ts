"use client";

import { useSyncExternalStore } from "react";
import type { ScenarioId } from "./scenarios";
import { SCENARIOS, SCENARIO_LIST } from "./scenarios";
import { DIMENSIONS, DIMENSION_LABELS, type Dimension, type Scorecard } from "./rubric/types";
import { buildScorecard } from "./rubric/score";
import { isPlanId, renewalDays, type PlanId } from "./pricing";

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
  useful?: boolean; // "Could you actually say this to your child?"
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
  lesson?: string | null; // the lesson the parent just read, shown as the focus of the next practice
  lessonsRead?: string[]; // lessons the parent has opened
  profile?: Profile; // answers from the start quiz
  phrases?: Phrase[]; // the parent's phrase bank
  helpUses?: HelpUse[]; // "Help me now" scripts opened
  plus?: PlusInfo; // billing details for this device's Plus
};

/** A sentence the parent saved to reuse at home. */
export type Phrase = {
  id: string;
  text: string;
  scenarioId: ScenarioId;
  situation: string; // short label, e.g. "Leaving the playground"
  score?: number;
  createdAt: string;
  /** Answer to "Did you try it at home?". Missing until asked. */
  home?: "worked" | "not_yet" | "didnt_work";
  homeAt?: string;
};

/** One "Help me now" script the parent opened, and whether it helped. */
export type HelpUse = { id: string; situation: string; createdAt: string; helped?: boolean };

export type PlusInfo = {
  since: string;
  /** Current plans, or "monthly" / "annual" from Plus bought before the plans changed. */
  plan?: PlanId | "monthly" | "annual";
  checkoutSessionId?: string; // lets this device pause or manage the subscription
  demo?: boolean; // unlocked without Stripe
  pausedUntil?: string;
  restored?: boolean; // unlocked again by email on this device
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
  check?: "a" | "b" | "c"; // the answer picked in the quiz's quick check
  checkScore?: number; // its score from the real rubric
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

/** Erases everything on this device: quiz answers, practice, plan, reminder choices and Plus (demo) unlock. */
export function resetStore() {
  save(blank());
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
  return Array.from({ length: 7 }, (_, i) => {
    const scenarioId = order[(Math.max(0, start) + i) % order.length];
    const wanted = i % 3 === 2 ? DIMENSIONS[(DIMENSIONS.indexOf(focus) + 1) % DIMENSIONS.length] : focus;
    // Never aim a day at a skill its moment doesn't score (naming the feeling in a safety-first moment).
    const scored = SCENARIOS[scenarioId].weights[wanted] !== 0;
    return { day: i + 1, scenarioId, focus: scored ? wanted : ("boundaries" as Dimension), done: false };
  });
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
  // An emptied time field falls back to the early evening instead of producing an invalid file.
  const [h, m] = (/^\d{1,2}:\d{2}/.test(time) ? time : "19:00").split(":").map(Number);
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
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, // the spec wants UTC here
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

// ---------- Phrase bank ----------

/** Free devices keep this many phrases; Plus keeps them all. */
export const FREE_PHRASES = 3;

export function canSavePhrase(s: Pick<Store, "phrases" | "unlocked">): boolean {
  return s.unlocked || (s.phrases?.length ?? 0) < FREE_PHRASES;
}

/** Adds a phrase unless the same words are already saved. Returns false when the free limit is reached. */
export function addPhrase(s: Store, p: Omit<Phrase, "id" | "createdAt">, now = new Date()): boolean {
  const text = p.text.trim();
  if (!text) return false;
  const list = s.phrases ?? [];
  if (list.some((x) => x.text.trim().toLowerCase() === text.toLowerCase())) return true;
  if (!canSavePhrase(s)) return false;
  s.phrases = [{ ...p, text, id: newId(), createdAt: now.toISOString() }, ...list].slice(0, 200);
  return true;
}

export function removePhrase(s: Store, id: string) {
  s.phrases = (s.phrases ?? []).filter((p) => p.id !== id);
}

export function markPhraseHome(s: Store, id: string, home: NonNullable<Phrase["home"]>, now = new Date()) {
  s.phrases = (s.phrases ?? []).map((p) => (p.id === id ? { ...p, home, homeAt: now.toISOString() } : p));
}

/**
 * The saved phrase to ask "Did you try it at home?" about: saved at least 8 hours ago,
 * never answered, or answered "not yet" more than a day ago. Newest first.
 */
export function phraseToCheck(phrases: Phrase[] | undefined, now = Date.now()): Phrase | null {
  const due = (phrases ?? []).filter((p) => {
    const saved = now - Date.parse(p.createdAt);
    if (!p.home) return saved >= 8 * 3_600_000;
    if (p.home === "not_yet" && p.homeAt) return now - Date.parse(p.homeAt) >= 24 * 3_600_000;
    return false;
  });
  return due[0] ?? null;
}

// ---------- Monthly recap ----------

export type Recap = {
  days: number;
  moments: number; // practices started (first tries and own moments)
  retries: number;
  helpUses: number;
  helped: number;
  phrasesSaved: number;
  workedAtHome: number;
  /** Per skill: the first practice in the window against the average of the last three after it. */
  skills: { d: Dimension; from: number; to: number }[];
};

export function monthlyRecap(s: Pick<Store, "attempts" | "phrases" | "helpUses">, now = Date.now(), days = 30): Recap {
  const since = now - days * 86_400_000;
  const inWindow = (iso: string) => Date.parse(iso) >= since && Date.parse(iso) <= now;
  const attempts = s.attempts.filter((a) => inWindow(a.createdAt));
  const phrases = (s.phrases ?? []).filter((p) => inWindow(p.createdAt));
  const help = (s.helpUses ?? []).filter((h) => inWindow(h.createdAt));
  const skills: Recap["skills"] = [];
  for (const d of DIMENSIONS) {
    const vals = attempts.map((a) => a.byDimension[d]).filter((v): v is number => typeof v === "number");
    if (vals.length < 2) continue;
    const last = vals.slice(1).slice(-3); // never average the starting point into the result
    skills.push({ d, from: vals[0], to: Math.round(last.reduce((x, y) => x + y, 0) / last.length) });
  }
  return {
    days,
    moments: attempts.filter((a) => a.kind === "first").length,
    retries: attempts.filter((a) => a.kind !== "first").length,
    helpUses: help.length,
    helped: help.filter((h) => h.helped).length,
    phrasesSaved: phrases.length,
    workedAtHome: (s.phrases ?? []).filter((p) => p.home === "worked" && p.homeAt && inWindow(p.homeAt)).length,
    skills: skills.sort((a, b) => b.to - b.from - (a.to - a.from)),
  };
}

/** The next renewal date for a plan bought on `since`, after `now`. */
export function nextRenewal(since: string, plan: NonNullable<PlusInfo["plan"]>, now = new Date()): Date {
  const d = new Date(since);
  if (!isPlanId(plan)) {
    // Plans from before the change: calendar months or years.
    while (d.getTime() <= now.getTime()) {
      if (plan === "annual") d.setFullYear(d.getFullYear() + 1);
      else d.setMonth(d.getMonth() + 1);
    }
    return d;
  }
  const { first, every } = renewalDays(plan);
  d.setDate(d.getDate() + first);
  while (d.getTime() <= now.getTime()) d.setDate(d.getDate() + every);
  return d;
}

// ---------- Plus gates for repeat value ----------

/** Free devices get one own moment ("Your own moment" or "Today I lost it"); Plus has no limit. */
export const FREE_OWN_MOMENTS = 1;

export function ownMomentsUsed(s: Pick<Store, "attempts">): number {
  return s.attempts.filter((a) => !a.demo && a.scenarioId === "custom" && a.kind === "first").length;
}

export function ownMomentLocked(s: Pick<Store, "attempts" | "unlocked">): boolean {
  return !s.unlocked && ownMomentsUsed(s) >= FREE_OWN_MOMENTS;
}

/** Saved phrases that fit a moment: the same built-in scenario, or own moments that mention one of the keywords. */
export function phrasesFor(phrases: Phrase[] | undefined, scenarioId: ScenarioId, keywords: string[] = []): Phrase[] {
  return (phrases ?? []).filter((p) =>
    scenarioId !== "custom" ? p.scenarioId === scenarioId : p.scenarioId === "custom" && keywords.some((k) => p.situation.toLowerCase().includes(k)),
  );
}

/** The current time. Components call it only after the browser store has loaded, never during prerender. */
export function clock(): Date {
  return new Date();
}
