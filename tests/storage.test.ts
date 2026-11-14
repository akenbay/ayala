import { describe, expect, it } from "vitest";
import { buildPlan, demoWeekAttempts, reminderIcs } from "../lib/storage";
import { SCENARIOS } from "../lib/scenarios";
import { buildScorecard } from "../lib/rubric/score";

describe("demo week", () => {
  it("is labeled demo, spans a week, and is scored by the real rubric", () => {
    const now = Date.UTC(2026, 10, 15, 12);
    const a = demoWeekAttempts(now);
    expect(a.every((x) => x.demo)).toBe(true);
    const days = new Set(a.map((x) => x.createdAt.slice(0, 10)));
    expect(days.size).toBeGreaterThanOrEqual(5);
    expect(a[0].total).toBeLessThan(50); // weak first try
    expect(a[a.length - 1].total).toBeGreaterThanOrEqual(85); // strong by the end
    for (const x of a) for (const c of x.turns[0].card.checks) if (c.evidence && !c.evidence.includes(" … ")) expect(x.turns[0].parent.includes(c.evidence)).toBe(true);
  });
});

describe("reminder", () => {
  it("creates a valid daily calendar event for 7 days", () => {
    const ics = reminderIcs("19:30", "https://example.com", "Name the feeling; then the limit, please.");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("RRULE:FREQ=DAILY;COUNT=7");
    expect(ics).toMatch(/DTSTART:\d{8}T193000/);
    expect(ics).toContain("feeling\\; then");
  });
});

describe("reminder edge cases", () => {
  it("still makes a valid file when the time field is empty", () => {
    const ics = reminderIcs("", "https://example.com", "tip");
    expect(ics).not.toContain("NaN");
    expect(ics).toMatch(/DTSTART:\d{8}T190000/);
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });
});

describe("plan", () => {
  it("never aims a day at a skill its moment does not score", () => {
    for (const p of buildPlan([], "emotional_response")) expect(SCENARIOS[p.scenarioId].weights[p.focus]).not.toBe(0);
  });
});

describe("threats", () => {
  it("catches the app's own example of an empty threat", () => {
    for (const t of ["If you don't stop, no TV ever again!", "That's it, no TV ever again!"]) {
      const c = buildScorecard(t, "bedtime_refusal", null, true).checks.find((x) => x.id === "no_empty_threats");
      expect(c?.passed).toBe(false);
    }
  });
});
