import { z } from "zod";
import { customOpening } from "@/lib/toddler";
import { detectCrisis } from "@/lib/safety";
import { clientIp, json, rateLimit } from "@/lib/server";

const Body = z.object({
  age: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  situation: z.string().min(5).max(400),
  child: z
    .object({
      sex: z.enum(["boy", "girl", "unsaid"]).optional(),
      temperament: z.enum(["calm", "active", "fiery", "sensitive"]).optional(),
    })
    .optional(),
});

/** The opening of the parent's own moment: a concrete scene, their earlier line, Sam's protest and a sample reply. */
export async function POST(req: Request) {
  if (!rateLimit(`opener:${clientIp(req)}`, 20)) return json({ error: "Too many tries. Try again shortly." }, 429);
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const crisis = detectCrisis(body.situation);
  if (crisis) return json({ crisis: crisis.kind });
  const o = await customOpening(body);
  return json({ ...o });
}
