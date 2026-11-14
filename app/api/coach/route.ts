import { z } from "zod";
import { coach } from "@/lib/coach";
import { isScenarioId, type ScenarioId } from "@/lib/scenarios";
import { clientIp, json, rateLimit } from "@/lib/server";
import type { Scorecard } from "@/lib/rubric/types";

const Check = z.object({
  id: z.string(),
  label: z.string().max(120),
  dimension: z.string(),
  passed: z.boolean(),
  points: z.number(),
  maxPoints: z.number(),
  evidence: z.string().max(400).nullable(),
  explanation: z.string().max(400),
  source: z.enum(["code", "llm"]),
  cdcBasis: z.string().max(200),
});

const Body = z.object({
  scenarioId: z.string().refine(isScenarioId),
  transfer: z.boolean().default(false),
  age: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  turns: z
    .array(
      z.object({
        parent: z.string().min(1).max(400),
        child: z.string().max(400).nullable(),
        state: z.enum(["going_along", "resisting", "meltdown", "gave_in"]).optional(),
        card: z.object({ total: z.number(), checks: z.array(Check).max(20) }).passthrough(),
      }),
    )
    .min(1)
    .max(3),
  situation: z.string().max(400).optional(),
});

/** Feedback on the whole practice conversation. Falls back to the code coach without a model. */
export async function POST(req: Request) {
  if (!rateLimit(`coach:${clientIp(req)}`, 20)) return json({ error: "Too many tries. Try again shortly." }, 429);
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const result = await coach({
    scenarioId: body.scenarioId as ScenarioId,
    transfer: body.transfer,
    age: body.age,
    situation: body.situation,
    turns: body.turns.map((t) => ({ ...t, card: t.card as unknown as Scorecard })),
  });
  return json(result);
}
