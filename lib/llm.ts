// Minimal server-only client for one fast language model.
// Default provider: OpenAI (ChatGPT models). Anthropic is supported as an alternative.
// Choose with LLM_PROVIDER=openai|anthropic; otherwise whichever key is set (OpenAI first).

export type ChatMessage = { role: "user" | "assistant"; content: string };

type CallOpts = { system: string; messages: ChatMessage[]; maxTokens: number; json?: boolean; timeoutMs?: number };

type Provider = "openai" | "anthropic";

function provider(): Provider | null {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function llmAvailable(): boolean {
  return provider() !== null;
}

export const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";

// Remembers per model whether optional parameters were rejected, so we stop sending them.
const unsupported = new Map<string, Set<string>>();

async function callOpenAi(opts: CallOpts, signal: AbortSignal): Promise<string> {
  const model = process.env.LLM_MODEL || DEFAULT_OPENAI_MODEL;
  const skip = unsupported.get(model) ?? new Set<string>();
  // Reasoning models count hidden reasoning tokens against the limit, so leave room.
  const optional: Record<string, unknown> = { temperature: 0, reasoning_effort: "minimal" };

  for (let attempt = 0; attempt < 3; attempt++) {
    const body: Record<string, unknown> = {
      model,
      max_completion_tokens: Math.max(opts.maxTokens * 4, 1024),
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    };
    for (const [k, v] of Object.entries(optional)) if (!skip.has(k)) body[k] = v;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return (data.choices?.[0]?.message?.content ?? "").trim();
    }
    const err = await res.text();
    // Drop an optional parameter the model rejects, then retry.
    const rejected = Object.keys(optional).find((k) => !skip.has(k) && err.includes(k));
    if (res.status === 400 && rejected) {
      skip.add(rejected);
      unsupported.set(model, skip);
      continue;
    }
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 300)}`);
  }
  throw new Error("OpenAI request failed after removing unsupported parameters");
}

async function callAnthropic(opts: CallOpts, signal: AbortSignal): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "claude-haiku-5-5",
      max_tokens: opts.maxTokens,
      temperature: 0,
      system: opts.system,
      messages: opts.messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).map((b) => b.text ?? "").join("").trim();
}

export async function callLlm(opts: CallOpts): Promise<string> {
  const p = provider();
  if (!p) throw new Error("No language model API key configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  try {
    return p === "openai" ? await callOpenAi(opts, controller.signal) : await callAnthropic(opts, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Extracts the first JSON object from a model reply. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in reply");
  return JSON.parse(text.slice(start, end + 1));
}
