import { describe, expect, it } from "vitest";
import { HELP_SCRIPTS, REPAIR_SCRIPT, matchScript } from "../lib/helpNow";
import { buildScorecard } from "../lib/rubric/score";
import { detectCrisis } from "../lib/safety";

describe("help me now scripts", () => {
  it("every script scores well on the code rubric for its moment", () => {
    // The big-meltdown script is calm-first on purpose (CDC time-in): no direction or choice yet.
    for (const s of HELP_SCRIPTS.filter((x) => x.id !== "meltdown")) {
      const card = buildScorecard(s.say.join(" "), s.practice, null, true);
      expect(card.total, `${s.id}: ${s.say.join(" ")}`).toBeGreaterThanOrEqual(80);
    }
  });

  it("no script trips the crisis check", () => {
    for (const s of [...HELP_SCRIPTS, REPAIR_SCRIPT]) expect(detectCrisis([...s.say, s.ifMore].join(" "))).toBeNull();
  });

  it("matches what the parent typed to the right script", () => {
    expect(matchScript("he won't turn off the ipad").id).toBe("screens");
    expect(matchScript("she bit her brother").id).toBe("hitting");
    expect(matchScript("refuses the car seat every morning").id).toBe("carseat");
    expect(matchScript("I yelled at him").id).toBe("repair");
    expect(matchScript("asdf").id).toBe("meltdown");
  });
});
