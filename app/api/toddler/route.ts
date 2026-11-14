import { z } from "zod";
import { toddlerReply } from "@/lib/toddler";
import { isScenarioId, type ScenarioId } from "@/lib/scenarios";
import { clientIp, json, rateLimit } from "@/lib/server";

const Body = z.object({
  scenarioId: z.string().refine(isScenarioId),
  age: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  transfer: z.boolean().optional().default(false),
  context: z.string().max(200).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(400) }))
    .min(2)
    .max(8),
});

export async function POST(req: Request) {
  if (!rateLimit(`toddler:${clientIp(req)}`, 40)) {
    return json({ error: "Too many tries in a minute. Try again shortly." }, 429);
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (body.history[body.history.length - 1].role !== "user") return json({ error: "Invalid request." }, 400);
  // The model API expects the conversation to start with a user turn.
  const history = body.history[0].role === "assistant"
    ? [{ role: "user" as const, content: "(The practice begins. Sam speaks first.)" }, ...body.history]
    : body.history;
  const result = await toddlerReply({
    scenarioId: body.scenarioId as ScenarioId,
    transfer: body.transfer,
    age: body.age,
    context: body.context,
    history,
  });
  return json(result);
}
