import { describe, expect, it } from "vitest";
import {
  FREE_PHRASES,
  addPhrase,
  markPhraseHome,
  monthlyRecap,
  nextRenewal,
  ownMomentLocked,
  phraseToCheck,
  phrasesFor,
  type Attempt,
  type Store,
} from "../lib/storage";

function store(over: Partial<Store> = {}): Store {
  return { sessionId: "t", childAge: 3, context: "", current: null, currentPlanDay: null, attempts: [], plan: [], unlocked: false, ...over };
}

function attempt(over: Partial<Attempt>): Attempt {
  return { id: Math.random().toString(), scenarioId: "leaving_playground", kind: "first", turns: [], total: 50, byDimension: {}, createdAt: new Date().toISOString(), ...over };
}

describe("phrase bank", () => {
  it("keeps the free limit, skips duplicates, and has no limit with Plus", () => {
    const s = store();
    for (let i = 0; i < FREE_PHRASES; i++) expect(addPhrase(s, { text: `Phrase ${i}`, scenarioId: "bedtime_refusal", situation: "Bedtime" })).toBe(true);
    expect(addPhrase(s, { text: "phrase 0 ", scenarioId: "bedtime_refusal", situation: "Bedtime" })).toBe(true); // already saved
    expect(addPhrase(s, { text: "One more", scenarioId: "bedtime_refusal", situation: "Bedtime" })).toBe(false);
    expect(s.phrases).toHaveLength(FREE_PHRASES);
    s.unlocked = true;
    expect(addPhrase(s, { text: "One more", scenarioId: "bedtime_refusal", situation: "Bedtime" })).toBe(true);
    expect(s.phrases![0].text).toBe("One more"); // newest first
  });

  it("asks about a phrase at home only after a while, and again a day after 'not yet'", () => {
    const s = store();
    const t0 = new Date("2026-11-10T10:00:00Z");
    addPhrase(s, { text: "It's time to go now.", scenarioId: "leaving_playground", situation: "Leaving" }, t0);
    expect(phraseToCheck(s.phrases, t0.getTime() + 3_600_000)).toBeNull();
    const p = phraseToCheck(s.phrases, t0.getTime() + 9 * 3_600_000)!;
    expect(p.text).toBe("It's time to go now.");
    markPhraseHome(s, p.id, "not_yet", new Date(t0.getTime() + 9 * 3_600_000));
    expect(phraseToCheck(s.phrases, t0.getTime() + 20 * 3_600_000)).toBeNull();
    expect(phraseToCheck(s.phrases, t0.getTime() + 34 * 3_600_000)).not.toBeNull();
    markPhraseHome(s, p.id, "worked");
    expect(phraseToCheck(s.phrases, t0.getTime() + 100 * 3_600_000)).toBeNull();
  });

  it("finds saved phrases for Help me now", () => {
    const s = store();
    addPhrase(s, { text: "Bedtime now.", scenarioId: "bedtime_refusal", situation: "Bedtime refusal" });
    addPhrase(s, { text: "Tablet off now.", scenarioId: "custom", situation: "He screams when the tablet goes off" });
    expect(phrasesFor(s.phrases, "bedtime_refusal").map((p) => p.text)).toEqual(["Bedtime now."]);
    expect(phrasesFor(s.phrases, "custom", ["tablet"]).map((p) => p.text)).toEqual(["Tablet off now."]);
    expect(phrasesFor(s.phrases, "custom", ["car"])).toEqual([]);
  });
});

describe("own moments", () => {
  it("are free once, then need Plus", () => {
    const s = store();
    expect(ownMomentLocked(s)).toBe(false);
    s.attempts.push(attempt({ scenarioId: "custom", kind: "first" }));
    expect(ownMomentLocked(s)).toBe(true);
    s.unlocked = true;
    expect(ownMomentLocked(s)).toBe(false);
  });

  it("don't count demo data", () => {
    expect(ownMomentLocked(store({ attempts: [attempt({ scenarioId: "custom", demo: true })] }))).toBe(false);
  });
});

describe("monthly recap", () => {
  it("counts only the last 30 days and shows skill change", () => {
    const now = Date.parse("2026-11-15T12:00:00Z");
    const day = 86_400_000;
    const s = store({
      attempts: [
        attempt({ createdAt: new Date(now - 40 * day).toISOString(), byDimension: { emotional_response: 0 } }),
        attempt({ createdAt: new Date(now - 20 * day).toISOString(), byDimension: { emotional_response: 20 } }),
        attempt({ createdAt: new Date(now - 10 * day).toISOString(), kind: "retry", byDimension: { emotional_response: 80 } }),
        attempt({ createdAt: new Date(now - 1 * day).toISOString(), byDimension: { emotional_response: 100 } }),
      ],
      helpUses: [
        { id: "a", situation: "bedtime", createdAt: new Date(now - 2 * day).toISOString(), helped: true },
        { id: "b", situation: "bedtime", createdAt: new Date(now - 45 * day).toISOString(), helped: true },
      ],
    });
    const r = monthlyRecap(s, now);
    expect(r.moments).toBe(2);
    expect(r.retries).toBe(1);
    expect(r.helpUses).toBe(1);
    expect(r.helped).toBe(1);
    expect(r.skills[0]).toEqual({ d: "emotional_response", from: 20, to: 90 });
  });
});

describe("renewal date", () => {
  it("follows the plan: trial renews after 7 days, then every 4 weeks; 12 weeks renews every 84 days", () => {
    const since = "2026-11-01T10:00:00Z";
    expect(nextRenewal(since, "trial", new Date("2026-11-03T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-08");
    expect(nextRenewal(since, "trial", new Date("2026-11-10T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-12-06");
    expect(nextRenewal(since, "four_week", new Date("2026-11-03T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-29");
    expect(nextRenewal(since, "twelve_week", new Date("2026-11-03T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-01-24");
  });

  it("still handles Plus bought on the old monthly and yearly plans", () => {
    expect(nextRenewal("2026-09-20T10:00:00Z", "monthly", new Date("2026-11-15T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-20");
    expect(nextRenewal("2026-09-20T10:00:00Z", "annual", new Date("2026-11-15T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-09-20");
  });
});

describe("plans", () => {
  it("match the deck: $4.99 / $14.99 / $29.99 first, then $19.99 every 4 weeks or $39.99 every 12 weeks", async () => {
    const { PLANS, termsLine } = await import("../lib/pricing");
    expect(termsLine(PLANS.trial)).toBe("$4.99 for 7 days, then $19.99 every 4 weeks");
    expect(termsLine(PLANS.four_week)).toBe("$14.99 today, then $19.99 every 4 weeks");
    expect(termsLine(PLANS.twelve_week)).toBe("$29.99 today, then $39.99 every 12 weeks");
    expect([PLANS.four_week.perMonth, PLANS.twelve_week.perMonth]).toEqual(["$21.66", "$14.44"]);
  });
});
