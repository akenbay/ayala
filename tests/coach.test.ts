import { afterEach, describe, expect, it, vi } from "vitest";
import { buildScorecard } from "../lib/rubric/score";
import { codeCoach, codeRewrite, coach, type CoachInput } from "../lib/coach";
import { decideState, signalsFromText } from "../lib/toddler";
import type { ScenarioId } from "../lib/scenarios";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function input(texts: string[], scenarioId: ScenarioId = "leaving_playground", transfer = false): CoachInput {
  let harsh = 0;
  const turns = texts.map((t, i) => {
    const s = signalsFromText(t);
    const state = decideState(s, i, harsh);
    if (s.harsh) harsh++;
    return { parent: t, child: "No!", state, card: buildScorecard(t, scenarioId, null, true) };
  });
  return { scenarioId, transfer, age: 3, turns };
}

describe("code coach", () => {
  it("links the parent's own words to Sam's reaction", () => {
    const c = codeCoach(input(["Come on, we're leaving NOW! Stop it!", "Okay, five more minutes then."]));
    expect(c.summary).toContain("five more minutes");
    expect(c.summary).toContain("got their way");
    // What caused the ending is what to change.
    expect(c.change.quote).toContain("five more minutes");
    expect(c.change.cdc).toContain("Consequences");
    expect(c.heard).toMatch(/get what I want/);
    // Never praise a phrase that was also yelling.
    expect(c.keep?.quote ?? "").not.toContain("NOW");
  });

  it("keeps the parent's good words in the rewrite and drops what hurt", () => {
    const text = "I know you want to stay with her, lets play with her about an hour and then we will go";
    const c = codeCoach(input([text]));
    expect(c.rewrite?.text).toContain("I know you want to stay with her");
    expect(c.rewrite?.text).not.toContain("an hour");
    expect(c.rewrite!.after).toBeGreaterThan(c.rewrite!.before);
  });

  it("rewrites score higher for every scenario and its new situation", () => {
    for (const id of ["leaving_playground", "bedtime_refusal", "hitting_sibling"] as ScenarioId[]) {
      for (const transfer of [false, true]) {
        const t = "Stop it right now!";
        const r = codeRewrite(t, buildScorecard(t, id, null, true), id, transfer);
        expect(r).toBeTruthy();
        expect(buildScorecard(r!, id, null, true).total).toBeGreaterThanOrEqual(60);
      }
    }
  });

  it("every quote is an exact part of what the parent typed", () => {
    const texts = ["You're being a bad girl. Get in the car!", "Can you please come here?"];
    const c = codeCoach(input(texts));
    const all = texts.join(" ");
    if (c.keep) expect(all).toContain(c.keep.quote.replace(/…$/, ""));
    if (c.change.quote) expect(all).toContain(c.change.quote.replace(/…$/, ""));
  });
});

describe("AI coach", () => {
  function reply(content: string) {
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  }

  it("uses the model's notes but replaces made up quotes and weak rewrites with the code version", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        reply(
          JSON.stringify({
            summary: "When you said “Stop it”, Sam kept resisting — try warmth.",
            keep: { quote: "words the parent never typed", why: "x" },
            change: { quote: "Stop it", why: "It tells Sam what not to do, not what to do." },
            rewrite: "Stop it.",
          }),
        ),
      ),
    );
    const inp = input(["Come on, we're leaving NOW! Stop it!"]);
    const c = await coach(inp);
    const base = codeCoach(inp);
    expect(c.source).toBe("ai");
    expect(c.summary).not.toMatch(/[—–]/);
    expect(c.keep).toEqual(base.keep); // invented quote rejected
    expect(c.change.quote).toBe("Stop it");
    expect(c.rewrite).toEqual(base.rewrite); // a rewrite that doesn't score higher is rejected
  });

  it("falls back to the code coach when the model fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    const c = await coach(input(["Can you please come here?"]));
    expect(c.source).toBe("code");
    expect(c.summary.length).toBeGreaterThan(10);
  });
});
