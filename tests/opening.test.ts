import { afterEach, describe, expect, it, vi } from "vitest";
import { customOpening } from "../lib/toddler";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const reply = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

describe("custom opening", () => {
  it("uses the model's scene, setup, protest and idea for the parent's own moment", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        reply(
          JSON.stringify({
            scene: "Your 3 year old refuses to put on cleats for soccer practice.",
            setup: "Shoes on, we're going to soccer.",
            opener: "No soccer! I want to stay home — with my cars.",
            idea: "You want to stay with your cars. It's time for soccer. Do you want to put on the red socks or the blue ones?",
          }),
        ),
      ),
    );
    const o = await customOpening({ age: 3, situation: "My kid does not play sports" });
    expect(o.ai).toBe(true);
    expect(o.scene).toMatch(/soccer/);
    expect(o.setup).toBe("Shoes on, we're going to soccer.");
    expect(o.opener).not.toMatch(/[—–]/);
    expect(o.idea).toMatch(/red socks/);
  });

  it("falls back to plain lines without a model", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const o = await customOpening({ age: 3, situation: "My kid does not play sports" });
    expect(o.ai).toBe(false);
    expect(o.scene).toBe("My kid does not play sports");
  });
});
