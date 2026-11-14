import Stripe from "stripe";
import { z } from "zod";
import { clientIp, json, rateLimit } from "@/lib/server";

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

/** Subscription states that still include Plus. A paused subscription keeps access. */
const ACTIVE = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

/**
 * Restores Plus on a new device or after browser data was cleared, using the email from Stripe Checkout.
 * Test mode only. It answers only yes or no and never returns billing details.
 * Before real payments this should email a one-time link instead of unlocking directly.
 */
export async function POST(req: Request) {
  if (!rateLimit(`restore:${clientIp(req)}`, 5)) return json({ error: "Too many tries. Wait a minute." }, 429);
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json({ demo: true });
  if (!key.startsWith("sk_test_")) return json({ error: "Only Stripe test mode is allowed here." }, 500);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Enter the email you used at checkout." }, 400);
  try {
    const stripe = new Stripe(key);
    const customers = await stripe.customers.list({ email: parsed.data.email, limit: 5 });
    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 10 });
      if (subs.data.some((s) => ACTIVE.has(s.status))) return json({ unlocked: true });
    }
    return json({ unlocked: false });
  } catch (err) {
    console.error("restore failed:", (err as Error).message);
    return json({ error: "Restore is unavailable right now." }, 502);
  }
}
