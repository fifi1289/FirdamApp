import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Stripe webhook → public.subscriptions.
 *
 * Deploy without JWT verification (Stripe can't send a Supabase token):
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 * Then add the endpoint in Stripe (Developers → Webhooks) for these events:
 *   checkout.session.completed, customer.subscription.created,
 *   customer.subscription.updated, customer.subscription.deleted
 *
 * Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_* (same as billing)
 */

import { verifyStripeSignature } from "./signature.ts";

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items: { data: { price: { id: string }; current_period_end?: number }[] };
}

function planForPrice(priceId: string | undefined, fallback?: string): "premium" | "family" {
  if (priceId && [env("STRIPE_PRICE_FAMILY_MONTHLY"), env("STRIPE_PRICE_FAMILY_YEARLY")].includes(priceId)) {
    return "family";
  }
  if (priceId && [env("STRIPE_PRICE_PREMIUM_MONTHLY"), env("STRIPE_PRICE_PREMIUM_YEARLY")].includes(priceId)) {
    return "premium";
  }
  // Firdam Family is the only plan sold now; older "premium" prices are matched above.
  return fallback === "premium" ? "premium" : "family";
}

const KNOWN_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);

async function stripeGet<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}` },
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}`);
  return (await res.json()) as T;
}

async function userIdForCustomer(customerId: string): Promise<string | null> {
  const customer = await stripeGet<{ metadata?: Record<string, string>; deleted?: boolean }>(
    `customers/${customerId}`,
  );
  return customer.metadata?.user_id ?? null;
}

async function upsertSubscription(row: Record<string, unknown>) {
  const url = env("SUPABASE_URL");
  const service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) throw new Error("Supabase service credentials missing");
  const res = await fetch(`${url}/rest/v1/subscriptions?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase upsert failed: ${res.status} ${await res.text()}`);
}

async function syncSubscription(sub: StripeSubscription) {
  const userId = sub.metadata?.user_id ?? (await userIdForCustomer(sub.customer));
  if (!userId) {
    console.warn("No user_id for customer", sub.customer);
    return;
  }
  const item = sub.items.data[0];
  const periodEnd = sub.current_period_end ?? item?.current_period_end;
  await upsertSubscription({
    user_id: userId,
    plan: planForPrice(item?.price.id, sub.metadata?.plan),
    status: KNOWN_STATUSES.has(sub.status) ? sub.status : "incomplete",
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    price_id: item?.price.id ?? null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = env("STRIPE_WEBHOOK_SECRET");
  if (!secret || !env("STRIPE_SECRET_KEY")) return new Response("Not configured", { status: 501 });

  const payload = await req.text();
  const valid = await verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret);
  if (!valid) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> } };
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as { subscription?: string | null };
        if (session.subscription) {
          await syncSubscription(await stripeGet<StripeSubscription>(`subscriptions/${session.subscription}`));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as unknown as StripeSubscription);
        break;
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    // A 500 makes Stripe retry later.
    return new Response(err instanceof Error ? err.message : "Error", { status: 500 });
  }
});
