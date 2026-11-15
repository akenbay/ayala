import Stripe from "stripe";
import { clientIp, json, rateLimit } from "@/lib/server";
import { DEFAULT_PLAN, PLANS, isPlanId, type PlanId } from "@/lib/pricing";

function origin(req: Request): string {
  const h = req.headers;
  return h.get("origin") || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

/**
 * Stripe coupon that makes the first period cheaper ($14.99 instead of $19.99, $29.99 instead of $39.99).
 * Created once in the test account, then reused by its fixed id.
 */
async function introCoupon(stripe: Stripe, id: string, amountOff: number): Promise<string> {
  try {
    await stripe.coupons.retrieve(id);
  } catch {
    await stripe.coupons.create({ id, amount_off: amountOff, currency: "usd", duration: "once", name: "Ayala first period" });
  }
  return id;
}

/**
 * Creates a Stripe Checkout session in test mode, one subscription per plan:
 * - 7-day trial: $4.99 one-time today, a 7 day trial, then $19.99 every 4 weeks
 * - 4 weeks: $14.99 today (intro coupon), then $19.99 every 4 weeks
 * - 12 weeks: $29.99 today (intro coupon), then $39.99 every 12 weeks
 */
export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 10)) return json({ error: "Too many tries." }, 429);
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json({ demo: true });
  if (!key.startsWith("sk_test_")) return json({ error: "Only Stripe test mode is allowed here." }, 500);
  let planId: PlanId = DEFAULT_PLAN;
  try {
    const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
    if (isPlanId(body.plan)) planId = body.plan;
  } catch {}
  const plan = PLANS[planId];
  try {
    const stripe = new Stripe(key);
    const base = origin(req);
    const renewal: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: plan.renewCents,
        recurring: { interval: "week", interval_count: plan.renewWeeks },
        product_data: {
          name: `Ayala Plus (${plan.renewWeeks} weeks)`,
          description: "Unlimited own moments, your full phrase bank, all 15 stories and new situations.",
        },
      },
    };
    const intro = plan.firstCents < plan.renewCents && !plan.trialDays;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: plan.trialDays
        ? [
            renewal,
            {
              quantity: 1,
              price_data: { currency: "usd", unit_amount: plan.firstCents, product_data: { name: `Ayala Plus ${plan.firstPeriod} trial` } },
            },
          ]
        : [renewal],
      ...(intro ? { discounts: [{ coupon: await introCoupon(stripe, `ayala_intro_${plan.id}`, plan.renewCents - plan.firstCents) }] } : {}),
      subscription_data: {
        metadata: { plan: planId },
        ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}),
      },
      metadata: { plan: planId },
      success_url: `${base}/pricing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?status=cancel`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error("checkout failed:", (err as Error).message);
    return json({ error: "Checkout is unavailable right now." }, 502);
  }
}
