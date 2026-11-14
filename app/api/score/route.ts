import { z } from "zod";
import { buildScorecard, isInjection } from "@/lib/rubric/score";
import { runLlmChecks } from "@/lib/rubric/llmChecks";
import { validateParentText } from "@/lib/rubric/validate";
import { detectCrisis } from "@/lib/safety";
import { cleanSituation, describe, describeWith, isScenarioId } from "@/lib/scenarios";
import { LruCache, clientIp, json, rateLimit, sha256 } from "@/lib/server";
import type { Scorecard } from "@/lib/rubric/types";

const Body = z.object({
  scenarioId: z.string().refine(isScenarioId, "Unknown scenario"),
  age: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string(),
  transfer: z.boolean().optional().default(false),
  situation: z.string().max(400).optional(),
});

// Same scenario, age and normalized text always get the same score.
const cache = new LruCache<Scorecard>(1000);

export async function POST(req: Request) {
  if (!rateLimit(`score:${clientIp(req)}`, 40)) {
    return json({ error: "Too many tries in a minute. Take a breath and try again shortly." }, 429);
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  // A parent in crisis gets help lines, not a score. Checked before anything else.
  const crisis = detectCrisis(body.text) ?? (body.situation ? detectCrisis(body.situation) : null);
  if (crisis) return json({ crisis: crisis.kind });

  const v = validateParentText(body.text);
  if (!v.ok) return json({ error: v.error, code: v.code }, 422);

  const scenarioId = body.scenarioId as Parameters<typeof describe>[0];
  const own = scenarioId === "custom" && !body.transfer ? cleanSituation(body.situation ?? "") : "";
  const key = await sha256(`${scenarioId}|${body.transfer}|${body.age}|${own}|${v.text.toLowerCase()}`);
  const hit = cache.get(key);
  if (hit) return json(hit);

  const scenario = describeWith(scenarioId, body.transfer, own);
  // Off-topic or injected text never reaches the model.
  const { verdicts, degraded } = isInjection(v.text)
    ? { verdicts: null, degraded: false }
    : await runLlmChecks(v.text, body.age, scenario.description);

  const card = buildScorecard(v.text, scenarioId, verdicts, degraded);
  if (!degraded) cache.set(key, card); // don't pin a degraded result
  return json(card);
}
