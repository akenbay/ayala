import { describe, expect, it } from "vitest";
import { LESSONS, LESSON_GROUPS, lessonForSkill } from "../lib/lessons";
import { SCENARIOS } from "../lib/scenarios";
import { CDC } from "../lib/rubric/cdc";
import { buildScorecard } from "../lib/rubric/score";
import { detectCrisis } from "../lib/safety";

describe("lessons", () => {
  it("have unique ids, a group, a CDC page and a real story to practice", () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(LESSON_GROUPS.some((g) => g.id === l.group), l.id).toBe(true);
      expect(CDC[l.cdc], l.id).toBeTruthy();
      expect(SCENARIOS[l.practice], l.id).toBeTruthy();
      expect(l.practice).not.toBe("custom");
      expect(l.points).toHaveLength(3);
    }
  });

  it("practice a story that actually scores the lesson's skill", () => {
    for (const l of LESSONS) expect(SCENARIOS[l.practice].weights[l.skill], l.id).not.toBe(0);
  });

  it("suggest phrases with no yelling, shaming, threats, bribes or crisis words", () => {
    for (const l of LESSONS) {
      const text = l.say.join(" ");
      expect(detectCrisis(text), l.id).toBeNull();
      const bad = buildScorecard(text, l.practice, null, true).checks.filter(
        (c) => ["no_yelling", "no_shaming", "no_empty_threats", "no_bribe"].includes(c.id) && !c.passed,
      );
      expect(bad.map((c) => c.id), `${l.id}: ${text}`).toEqual([]);
    }
  });

  it("the starting lesson for any skill opens a free story", () => {
    for (const d of ["clear_direction", "calm_respectful", "emotional_response", "boundaries", "positive_guidance", null] as const)
      expect(SCENARIOS[lessonForSkill(d).practice].free).toBe(true);
  });
});
