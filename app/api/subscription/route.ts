import Stripe from "stripe";
import { z } from "zod";
import { clientIp, json, rateLimit } from "@/lib/server";

const Body = z.object({
  sessionId: z.string().regex(/^cs_test_[A-Za-z0-9]+$/),
  action: z.enum(["pause", "resume", "portal"]),
});

const PAUSE_DAYS = 30;

function origin(req: Request): string {
  const h = req.headers;
  return h.get("origin") || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

/**
 * Manages this device's Plus subscription, found through its Checkout session id (kept only in this browser).
 * pause: skip billing for 30 days and keep access. resume: bill again. portal: Stripe's page to cancel or change card.
 */
export async function POST(req: Request) {
  if (!rateLimit(`subscription:${clientIp(req)}`, 10)) return json({ error: "Too many tries." }, 429);
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json({ demo: true });
  if (!key.startsWith("sk_test_")) return json({ error: "Only Stripe test mode is allowed here." }, 500);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "This device has no Plus subscription to manage." }, 400);
  const { sessionId, action } = parsed.data;
  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!subId || !customer) return json({ error: "No subscription found for this purchase." }, 404);

    if (action === "portal") {
      const portal = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin(req)}/pricing` });
      return json({ url: portal.url });
    }
    if (action === "pause") {
      const resumesAt = Math.floor(Date.now() / 1000) + PAUSE_DAYS * 86_400;
      await stripe.subscriptions.update(subId, { pause_collection: { behavior: "void", resumes_at: resumesAt } });
      return json({ pausedUntil: new Date(resumesAt * 1000).toISOString() });
    }
    await stripe.subscriptions.update(subId, { pause_collection: "" });
    return json({ resumed: true });
  } catch (err) {
    console.error("subscription action failed:", (err as Error).message);
    const portalMissing = action === "portal" && /configuration/i.test((err as Error).message);
    return json(
      { error: portalMissing ? "The Stripe customer portal isn't set up in test mode yet. Save it once in the Stripe dashboard." : "That didn't work. Try again." },
      502,
    );
  }
}
