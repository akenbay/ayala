import Stripe from "stripe";
import { json } from "@/lib/server";
import { DEFAULT_PLAN, isPlanId } from "@/lib/pricing";

/** Confirms a finished test checkout so the browser can unlock Plus. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!id || !key || !/^cs_test_[A-Za-z0-9]+$/.test(id)) return json({ unlocked: false }, 400);
  try {
    const session = await new Stripe(key).checkout.sessions.retrieve(id);
    const ok = session.status === "complete" && session.payment_status !== "unpaid";
    const plan = isPlanId(session.metadata?.plan) ? session.metadata?.plan : DEFAULT_PLAN;
    return json({ unlocked: ok, plan });
  } catch {
    return json({ unlocked: false }, 502);
  }
}
