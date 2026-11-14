import Stripe from "stripe";
import { clientIp, json, rateLimit } from "@/lib/server";
import { PRICE_CENTS } from "@/lib/pricing";



function origin(req: Request): string {
  const h = req.headers;
  return h.get("origin") || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

/** Creates a Stripe Checkout session in test mode. */
export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 10)) return json({ error: "Too many tries." }, 429);
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json({ demo: true });
  if (!key.startsWith("sk_test_")) return json({ error: "Only Stripe test mode is allowed here." }, 500);
  try {
    const stripe = new Stripe(key);
    const base = origin(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS,
            recurring: { interval: "month" },
            product_data: {
              name: "CalmRehearsal Plus",
              description: "All scenarios, the full 7 day practice plan, saved progress.",
            },
          },
        },
      ],
      success_url: `${base}/pricing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?status=cancel`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error("checkout failed:", (err as Error).message);
    return json({ error: "Checkout is unavailable right now." }, 502);
  }
}
