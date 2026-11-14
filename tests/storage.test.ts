import { describe, expect, it } from "vitest";
import { demoWeekAttempts, reminderIcs } from "../lib/storage";

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
