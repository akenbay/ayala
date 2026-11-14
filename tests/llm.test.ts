import { afterEach, describe, expect, it, vi } from "vitest";
import { callLlm, DEFAULT_OPENAI_MODEL } from "../lib/llm";
import { runLlmChecks } from "../lib/rubric/llmChecks";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function reply(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

describe("OpenAI client", () => {
  it("uses OpenAI with max_completion_tokens and the default model", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("LLM_MODEL", "");
    const fetchMock = vi.fn(async () => reply("Hi"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await callLlm({ system: "s", messages: [{ role: "user", content: "u" }], maxTokens: 50 })).toBe("Hi");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(url).toContain("api.openai.com/v1/chat/completions");
    expect(body.model).toBe(DEFAULT_OPENAI_MODEL);
    expect(body.max_completion_tokens).toBeGreaterThan(0);
    expect(body.max_tokens).toBeUndefined();
  });

  it("drops parameters the model rejects and retries", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("LLM_MODEL", "test-reasoning-model");
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      const b = JSON.parse(init.body as string);
      bodies.push(b);
      if ("temperature" in b) return new Response("Unsupported parameter: 'temperature'", { status: 400 });
      if ("reasoning_effort" in b) return new Response("Unsupported value: 'reasoning_effort'", { status: 400 });
      return reply("ok");
    }));
    expect(await callLlm({ system: "s", messages: [{ role: "user", content: "u" }], maxTokens: 50 })).toBe("ok");
    expect(bodies.length).toBe(3);
    expect(bodies[2].temperature).toBeUndefined();
  });

  it("parses semantic checks from an OpenAI JSON reply", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal("fetch", vi.fn(async () =>
      reply(JSON.stringify({ checks: [{ id: "acknowledges_feeling", passed: true, quote: "You wish", reason: "Names the wish." }] })),
    ));
    const r = await runLlmChecks("You wish we could stay.", 3, "Leaving the playground");
    expect(r.degraded).toBe(false);
    expect(r.verdicts?.[0].id).toBe("acknowledges_feeling");
  });

  it("falls back to degraded mode when the API fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("server error", { status: 500 })));
    const r = await runLlmChecks("You wish we could stay.", 3, "Leaving the playground");
    expect(r.degraded).toBe(true);
    expect(r.verdicts).toBeNull();
  });
});
