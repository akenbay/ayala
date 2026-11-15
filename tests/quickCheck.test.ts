import { describe, expect, it } from "vitest";
import { CHECK_OPTIONS, checkScore } from "../lib/quickCheck";
import { detectCrisis } from "../lib/safety";

describe("quiz quick check", () => {
  it("scores the strong answer highest and the threat lowest, with the real rubric", () => {
    const [a, b, c] = (["a", "b", "c"] as const).map(checkScore);
    expect(b).toBeGreaterThanOrEqual(85);
    expect(a).toBeLessThan(b);
    expect(c).toBeLessThan(a);
  });

  it("is repeatable and safe", () => {
    expect(checkScore("a")).toBe(checkScore("a"));
    for (const o of CHECK_OPTIONS) expect(detectCrisis(o.text)).toBeNull();
  });

  it("weak answers point to a focus skill, the strong one keeps the quiz's", () => {
    expect(CHECK_OPTIONS.find((o) => o.id === "a")!.focus).toBe("clear_direction");
    expect(CHECK_OPTIONS.find((o) => o.id === "c")!.focus).toBe("calm_respectful");
    expect(CHECK_OPTIONS.find((o) => o.id === "b")!.focus).toBeNull();
  });
});
