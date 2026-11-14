import Stripe from "stripe";
import { json } from "@/lib/server";

/** Confirms a finished test checkout so the browser can unlock Plus. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!id || !key || !/^cs_test_[A-Za-z0-9]+$/.test(id)) return json({ unlocked: false }, 400);
  try {
    const session = await new Stripe(key).checkout.sessions.retrieve(id);
    const ok = session.status === "complete" && session.payment_status !== "unpaid";
    const plan = session.metadata?.plan === "annual" ? "annual" : "monthly";
    return json({ unlocked: ok, plan });
  } catch {
    return json({ unlocked: false }, 502);
  }
}
