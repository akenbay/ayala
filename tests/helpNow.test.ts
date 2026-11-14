import { describe, expect, it } from "vitest";
import { HELP_SCRIPTS, REPAIR_SCRIPT, generalScript, matchScript, parseAiScript } from "../lib/helpNow";
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
});

describe("matching what the parent typed", () => {
  const id = (t: string) => matchScript(t)?.id ?? null;

  it("finds the right ready script", () => {
    expect(id("he won't turn off the ipad")).toBe("screens");
    expect(id("she bit her brother")).toBe("hitting");
    expect(id("she bit me")).toBe("hitting");
    expect(id("he kicked the dog")).toBe("hitting");
    expect(id("refuses the car seat every morning")).toBe("carseat");
    expect(id("I yelled at him")).toBe("repair");
    expect(id("won't put his shoes on")).toBe("dressing");
  });

  it("matches whole words only, so 'scared' and 'careful' are not the car seat", () => {
    expect(id("she is scared of the dark")).toBeNull();
    expect(id("daughter is careful but upset")).not.toBe("carseat");
    expect(id("this is so hard")).toBeNull();
  });

  it("returns null when nothing ready fits, so a tailored script is written instead", () => {
    expect(id("He won't get in the bath")).toBeNull();
    expect(id("won't brush teeth")).toBeNull();
    expect(id("asdf")).toBeNull();
  });

  it("the general fallback keeps what the parent typed for practice", () => {
    const g = generalScript("won't brush teeth");
    expect(g.id).toBe("general");
    expect(g.situation).toBe("won't brush teeth");
    expect(g.practice).toBe("custom");
  });
});

describe("checking a model-written script", () => {
  const good = {
    label: "Bath refusal",
    say: ["You really want to keep playing.", "It's bath time now.", "Do you want to walk to the bath or hop like a frog?"],
    ifMore: "Stay calm and say: \"I'll help you get in.\" Then gently help.",
    avoid: "Arguing about why baths matter.",
  };

  it("accepts a good script and cleans dashes", () => {
    const s = parseAiScript({ ...good, ifMore: "Stay calm — then gently help." }, "bath")!;
    expect(s.id).toBe("ai");
    expect(s.say).toHaveLength(3);
    expect(s.ifMore).not.toMatch(/[—–]/);
  });

  it("rejects missing parts, wrong line counts and weak wording", () => {
    expect(parseAiScript(null, "x")).toBeNull();
    expect(parseAiScript({ ...good, say: good.say.slice(0, 2) }, "x")).toBeNull();
    expect(parseAiScript({ ...good, avoid: "" }, "x")).toBeNull();
    expect(parseAiScript({ ...good, say: ["GET IN THE BATH NOW!", "Stop it!", "Or no TV ever again!"] }, "x")).toBeNull();
  });

  it("accepts plain, sound wording the rubric doesn't score highly", () => {
    for (const say of [
      ["You want to keep playing.", "Bath time is now.", "You can climb in yourself or I can help you in."],
      ["You hate brushing your teeth.", "Teeth get brushed now.", "You can brush first, or I can brush first."],
      ["You want the doll too.", "It's her turn right now.", "You can wait for a turn or pick another toy."],
    ])
      expect(parseAiScript({ ...good, say }, "x"), say.join(" ")).not.toBeNull();
  });

  it("rejects shaming and bribes", () => {
    expect(parseAiScript({ ...good, say: ["You're being a baby.", "Get in the bath.", "Walk or I carry you."] }, "x")).toBeNull();
    expect(parseAiScript({ ...good, say: ["If you get in the bath you get candy.", "Bath now.", "Duck or boat?"] }, "x")).toBeNull();
  });

  it("rejects crisis language", () => {
    expect(parseAiScript({ ...good, ifMore: "Sometimes I want to kill myself." }, "x")).toBeNull();
  });
});
